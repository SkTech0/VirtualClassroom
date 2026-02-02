import { Injectable } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class SignalRService {
  private hubConnection: signalR.HubConnection | null = null;
  private connectionState = new BehaviorSubject<boolean>(false);
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 2000; // 2 seconds
  private currentHubUrl = '';
  private currentOptions: signalR.IHttpConnectionOptions | undefined;

  connectionState$ = this.connectionState.asObservable();

  /**
   * Start a new SignalR connection with optional auth.
   * Returns a Promise that resolves when connected, or rejects on failure.
   */
  startConnection(hubUrl: string, options?: signalR.IHttpConnectionOptions): Promise<void> {
    this.currentHubUrl = hubUrl;
    this.currentOptions = options;

    this.hubConnection = new signalR.HubConnectionBuilder()
      .withUrl(hubUrl, options ?? {})
      .withAutomaticReconnect([0, 2000, 5000, 10000, 30000]) // Exponential backoff
      .configureLogging(signalR.LogLevel.Information)
      .build();

    this.setupConnectionHandlers();
    return this.connect();
  }

  private setupConnectionHandlers() {
    if (!this.hubConnection) return;

    this.hubConnection.onreconnecting((error) => {
      console.log('🔄 SignalR reconnecting...', error);
      this.connectionState.next(false);
    });

    this.hubConnection.onreconnected((connectionId) => {
      console.log('✅ SignalR reconnected with connection ID:', connectionId);
      this.connectionState.next(true);
      this.reconnectAttempts = 0;
    });

    this.hubConnection.onclose((error) => {
      console.log('❌ SignalR connection closed:', error);
      this.connectionState.next(false);
      
      // Attempt manual reconnection if not at max attempts
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        this.attemptReconnect();
      }
    });
  }

  private async connect() {
    if (!this.hubConnection) return;

    try {
      await this.hubConnection.start();
      console.log('✅ SignalR connected');
      this.connectionState.next(true);
      this.reconnectAttempts = 0;
    } catch (err) {
      console.error('❌ SignalR connection error:', err);
      this.connectionState.next(false);
      
      // Attempt manual reconnection
      this.attemptReconnect();
    }
  }

  private async attemptReconnect() {
    this.reconnectAttempts++;
    console.log(`🔄 Attempting reconnection ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      return;
    }

    if (!this.hubConnection || this.hubConnection.state !== signalR.HubConnectionState.Disconnected) {
      return;
    }

    setTimeout(() => {
      if (this.hubConnection?.state === signalR.HubConnectionState.Disconnected) {
        this.connect();
      }
    }, this.reconnectDelay * this.reconnectAttempts);
  }

  /**
   * Stop the current SignalR connection.
   * Prevents automatic reconnect (e.g. when navigating away).
   */
  stopConnection(): void {
    if (this.hubConnection) {
      this.reconnectAttempts = this.maxReconnectAttempts;
      this.hubConnection.stop();
      this.connectionState.next(false);
    }
  }

  /**
   * Register a listener for a SignalR event.
   */
  on<T>(event: string, callback: (data: T) => void): void {
    this.hubConnection?.on(event, callback);
  }

  /**
   * Remove a listener for a SignalR event.
   */
  off(event: string): void {
    this.hubConnection?.off(event);
  }

  /**
   * Safely invoke a method if connection is active.
   */
  async invoke(method: string, ...args: any[]) {
    if (!this.hubConnection || this.hubConnection.state !== signalR.HubConnectionState.Connected) {
      throw new Error('SignalR connection is not in Connected state');
    }

    try {
      return await this.hubConnection.invoke(method, ...args);
    } catch (err) {
      console.error(`❌ Failed to invoke '${method}':`, err);
      throw err;
    }
  }

  /**
   * Get current connection state
   */
  isConnected(): boolean {
    return this.hubConnection?.state === signalR.HubConnectionState.Connected;
  }

  /**
   * Get connection state as string
   */
  getConnectionState(): string {
    return this.hubConnection?.state || 'Disconnected';
  }

  /**
   * Force reconnection
   */
  async forceReconnect(): Promise<void> {
    if (this.hubConnection) {
      await this.hubConnection.stop();
      this.reconnectAttempts = 0;
      this.connect();
    }
  }
}
