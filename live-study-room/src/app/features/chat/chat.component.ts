import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { SignalRService } from '../../core/services/signalr.service';
import { PrimaryButtonComponent } from '../../shared/button/primary-button.component';
import { DatePipe, CommonModule } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';
import { Subscription } from 'rxjs';
import { filter, take } from 'rxjs/operators';

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

    // Room component already starts SignalR and joins the group; wait for connection then join (idempotent).
    this.signalR.connectionState$.pipe(
      filter(connected => connected),
      take(1)
    ).subscribe(() => {
      this.signalR.invoke('JoinRoomGroup', this.roomCode).catch(() => {});
    });

    this.signalR.on<ChatMessage>('ReceiveMessage', msg => {
      this.messages.push(msg);
    });
  }

  sendMessage() {
    if (this.form.invalid || !this.roomCode) return;

    this.sending = true;
    const msgText = this.form.value.message!;
    const userObj = this.auth.getUserFromStorage();
    const username = userObj?.username || 'Me';
    const timestamp = new Date().toISOString();

    const msg: ChatMessage = {
      user: username,
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