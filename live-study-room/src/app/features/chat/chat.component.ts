import { Component, Input, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { SignalRService } from '../../core/services/signalr.service';
import { PrimaryButtonComponent } from '../../shared/button/primary-button.component';
import { DatePipe, CommonModule } from '@angular/common';
import { AuthService } from '../../core/services/auth.service';
import { MatSnackBar } from '@angular/material/snack-bar';
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
export class ChatComponent implements OnInit, OnDestroy, AfterViewChecked {
  @Input() roomCode?: string;
  @ViewChild('messagesContainer') messagesContainer?: ElementRef<HTMLDivElement>;
  messages: ChatMessage[] = [];
  form;
  sending = false;
  private subscriptions: Subscription[] = [];
  private shouldScrollToBottom = false;

  constructor(
    private fb: FormBuilder,
    private signalR: SignalRService,
    public auth: AuthService,
    private snackBar: MatSnackBar
  ) {
    this.form = this.fb.group({
      message: ['', Validators.required],
    });
  }

  ngOnInit() {
    if (!this.roomCode) return;

    this.signalR.connectionState$.pipe(
      filter(connected => connected),
      take(1)
    ).subscribe(() => {
      this.signalR.invoke('JoinRoomGroup', this.roomCode).catch(() => {});
    });

    this.signalR.on<ChatMessage>('ReceiveMessage', msg => {
      this.messages.push(msg);
      this.shouldScrollToBottom = true;
    });
  }

  ngAfterViewChecked() {
    if (this.shouldScrollToBottom && this.messagesContainer?.nativeElement) {
      this.messagesContainer.nativeElement.scrollTop = this.messagesContainer.nativeElement.scrollHeight;
      this.shouldScrollToBottom = false;
    }
  }

  sendMessage() {
    if (this.form.invalid || !this.roomCode) return;

    this.sending = true;
    const msgText = this.form.value.message!;
    const userObj = this.auth.getUserFromStorage();
    const username = userObj?.username || 'Me';

    this.signalR.invoke('SendMessage', this.roomCode, username, msgText)
      .then(() => {
        this.sending = false;
        this.form.reset();
        this.shouldScrollToBottom = true;
      })
      .catch(() => {
        this.sending = false;
        this.snackBar.open('Could not send message. Check your connection and try again.', 'Close', { duration: 4000 });
      });
  }

  ngOnDestroy(): void {
    this.signalR.off('ReceiveMessage');
    this.subscriptions.forEach(s => s.unsubscribe());
  }
}