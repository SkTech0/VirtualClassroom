import { Injectable } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class SignalRService {
  private hubConnection: signalR.HubConnection | null = null;
  private connectionState = new BehaviorSubject<boolean>(false);
  connectionState$ = this.connectionState.asObservable();

  startConnection(hubUrl: string, options?: signalR.IHttpConnectionOptions) {
    if (options) {
      this.hubConnection = new signalR.HubConnectionBuilder()
        .withUrl(hubUrl, options)
        .withAutomaticReconnect()
        .build();
    } else {
      this.hubConnection = new signalR.HubConnectionBuilder()
        .withUrl(hubUrl)
        .withAutomaticReconnect()
        .build();
    }
    this.hubConnection
      .start()
      .then(() => this.connectionState.next(true))
      .catch(() => this.connectionState.next(false));
  }

  stopConnection() {
    this.hubConnection?.stop();
    this.connectionState.next(false);
  }

  on<T>(event: string, callback: (data: T) => void) {
    this.hubConnection?.on(event, callback);
  }

  off(event: string) {
    this.hubConnection?.off(event);
  }

  invoke(method: string, ...args: any[]) {
    return this.hubConnection?.invoke(method, ...args);
  }
} 