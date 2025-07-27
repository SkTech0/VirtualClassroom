import { Injectable } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class SignalRService {
  private hubConnection: signalR.HubConnection | null = null;
  private connectionState = new BehaviorSubject<boolean>(false);
  connectionState$ = this.connectionState.asObservable();

  /**
   * Start a new SignalR connection with optional auth.
   */
  startConnection(hubUrl: string, options?: signalR.IHttpConnectionOptions): void {
    this.hubConnection = new signalR.HubConnectionBuilder()
      .withUrl(hubUrl, options ?? {})
      .withAutomaticReconnect()
      .configureLogging(signalR.LogLevel.Information)
      .build();

    this.hubConnection
      .start()
      .then(() => {
        console.log('✅ SignalR connected');
        this.connectionState.next(true);
      })
      .catch(err => {
        console.error('❌ SignalR connection error:', err);
        this.connectionState.next(false);
      });
  }

  /**
   * Stop the current SignalR connection.
   */
  stopConnection(): void {
    if (this.hubConnection) {
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

}
