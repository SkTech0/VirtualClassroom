import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { SignalRService } from '../../core/services/signalr.service';
import { PrimaryButtonComponent } from '../../shared/button/primary-button.component';
import { DatePipe, CommonModule } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';
import { Subscription } from 'rxjs';

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
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.css'],
})
export class ChatComponent implements OnInit, OnDestroy {
  @Input() roomCode?: string;
  messages: ChatMessage[] = [];
  form;
  sending = false;
  private subscriptions: Subscription[] = [];

  constructor(
    private fb: FormBuilder,
    private signalR: SignalRService,
    public auth: AuthService
  ) {
    this.form = this.fb.group({
      message: ['', Validators.required],
    });
  }


  ngOnInit() {
    if (!this.roomCode) return;

    const token = this.auth.getToken();
    this.signalR.startConnection('http://localhost:5275/hubs/room', {
      accessTokenFactory: () => token || '',
    });

    this.signalR.invoke('JoinRoomGroup', this.roomCode);

    this.signalR.on<ChatMessage>('ReceiveMessage', msg => {
      this.messages.push(msg);
    });
  }

  sendMessage() {
    if (this.form.invalid || !this.roomCode) return;

    this.sending = true;
    const msgText = this.form.value.message!;
    const user = this.auth.getUserFromStorage() || 'Me';
    const timestamp = new Date().toISOString();

    const msg: ChatMessage = {
      user,
      message: msgText,
      timestamp,
    };

    this.signalR.invoke('SendMessage', this.roomCode, msg.user, msg.message)
      ?.then(() => {
        this.sending = false;
        this.form.reset();
      })
      .catch(() => {
        this.sending = false;
      });
  }

  ngOnDestroy(): void {
    this.signalR.off('ReceiveMessage');
    this.signalR.stopConnection();
    this.subscriptions.forEach(s => s.unsubscribe());
  }
}
