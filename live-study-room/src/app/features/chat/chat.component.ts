import { Component, Input, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { SignalRService } from '../../core/services/signalr.service';
import { PrimaryButtonComponent } from '../../shared/button/primary-button.component';
import { DatePipe, CommonModule } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';

interface ChatMessage {
  user: string;
  message: string;
  timestamp: string;
}

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    PrimaryButtonComponent,
    DatePipe
  ],
  template: `
    <div class="card shadow-sm" style="max-width: 500px; margin: 2rem auto;">
      <div class="card-body">
        <div style="max-height: 200px; overflow-y: auto; margin-bottom: 1rem;">
          <div *ngFor="let msg of messages">
            <strong>{{ msg.user }}:</strong> {{ msg.message }}
            <span class="text-muted small">({{ msg.timestamp | date:'shortTime' }})</span>
          </div>
        </div>
        <form [formGroup]="form" (ngSubmit)="sendMessage()" class="d-flex gap-2 align-items-end">
          <input class="form-control" formControlName="message" placeholder="Type a message..." />
          <app-primary-button [loading]="sending" type="submit">Send</app-primary-button>
        </form>
      </div>
    </div>
  `
})
export class ChatComponent implements OnInit {
  @Input() roomCode = '';
  messages: ChatMessage[] = [];
  form;
  sending = false;

  constructor(
    private fb: FormBuilder,
    private signalR: SignalRService,
    public auth: AuthService
  ) {
    this.form = this.fb.group({ message: ['', Validators.required] });
  }

  ngOnInit() {
    if (this.roomCode) {
      const token = this.auth.getToken();
      if (token) {
        this.signalR.startConnection('http://localhost:5275/hubs/room', { accessTokenFactory: () => token });
      } else {
        this.signalR.startConnection('http://localhost:5275/hubs/room');
      }
      this.signalR.invoke('JoinRoomGroup', this.roomCode);
      this.signalR.on<any>('ReceiveMessage', msg => {
        this.messages.push(msg);
      });
    }
  }

  sendMessage() {
    if (this.form.invalid || !this.roomCode) return;
    this.sending = true;
    const msg = this.form.value.message!;
    const user = this.auth.getUserFromStorage()?.name || 'Me';
    (this.signalR['hubConnection']?.invoke('SendMessage', this.roomCode, user, msg) ?? Promise.resolve())
      .then(() => {
        this.sending = false;
        this.form.reset();
      });
  }
} 