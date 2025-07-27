import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { SignalRService } from '../../core/services/signalr.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatBadgeModule } from '@angular/material/badge';
import { MatTabsModule } from '@angular/material/tabs';
import { MatListModule } from '@angular/material/list';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

interface Room {
  id: string;
  code: string;
  subject: string;
  hostUsername: string;
  isActive: boolean;
  createdAt: string;
}

interface Participant {
  id: string;
  name: string;
  email: string;
  isHost?: boolean;
  status?: 'active' | 'idle' | 'away';
}

@Component({
  selector: 'app-room',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatDividerModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatBadgeModule,
    MatTabsModule,
    MatListModule,
    MatFormFieldModule,
    MatInputModule,
    MatMenuModule,
    MatDialogModule
  ],
  templateUrl: './room.component.html',
  styleUrls: ['./room.component.css'],
})
export class RoomComponent implements OnInit, OnDestroy {
  room: Room | null = null;
  participants: Participant[] = [];
  chatMessages: any[] = [];
  newMessage = '';
  pomodoroTime = 1500; // 25 minutes in seconds
  pomodoroActive = false;
  pomodoroMode = 'work';
  leaderboard: any[] = [];
  private destroy$ = new Subject<void>();
  private pomodoroInterval: any;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private api: ApiService,
    private signalR: SignalRService,
    private auth: AuthService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog
  ) {}

  ngOnInit() {
    const code = this.route.snapshot.paramMap.get('code');
    if (code) {
      this.loadRoom(code);
      this.setupSignalR(code);
    }
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.pomodoroInterval) {
      clearInterval(this.pomodoroInterval);
    }
    this.signalR.stopConnection();
  }

  loadRoom(code: string) {
    this.api.get<Room>(`room/${code}`).subscribe({
      next: room => {
        this.room = room;
        this.loadParticipants();
        this.loadLeaderboard();
      },
      error: () => {
        this.snackBar.open('Failed to load room', 'Close', { duration: 3000 });
        this.router.navigate(['/room']);
      }
    });
  }

async setupSignalR(code: string) {
  const token = this.auth.getToken();

  await this.signalR.startConnection('http://localhost:5275/hubs/room', {
    accessTokenFactory: () => token || ''
  });

  this.signalR.connectionState$.subscribe(connected => {
    if (connected) {
      this.signalR.invoke('JoinRoomGroup', code)
        .catch(err => console.error('JoinRoomGroup failed:', err));
    }
  });

  this.signalR.on('ParticipantsChanged', () => this.loadParticipants());
  this.signalR.on('ReceiveMessage', (message: any) => {
    this.chatMessages.push(message);
  });
  this.signalR.on('ReminderReceived', (message: string) => {
    this.snackBar.open(message, 'Close', { duration: 5000 });
  });
}


  loadParticipants() {
    if (!this.room) return;
    this.api.get<Participant[]>(`room/${this.room.code}/participants`).subscribe({
      next: participants => {
        this.participants = participants.map(p => ({
          ...p,
          isHost: p.name === this.room?.hostUsername,
          status: 'active' as const
        }));
      },
      error: () => this.participants = []
    });
  }

  loadLeaderboard() {
    // Mock data for now
    this.leaderboard = [
      { username: 'John Doe', focusMinutes: 120, pomodoros: 4 },
      { username: 'Jane Smith', focusMinutes: 90, pomodoros: 3 },
      { username: 'Bob Johnson', focusMinutes: 60, pomodoros: 2 }
    ];
  }

sendMessage() {
  if (!this.newMessage.trim() || !this.room) return;

  const username = this.auth.getUserFromStorage()?.username || 'Anonymous';

  this.signalR.connectionState$.subscribe(connected => {
    if (connected) {
      this.signalR.invoke('SendMessage', this.room!.code, username, this.newMessage.trim())
        .catch(err => {
          console.error('❌ SendMessage failed:', err);
          this.snackBar.open('Message failed to send', 'Close', { duration: 2000 });
        });
      this.newMessage = '';
    } else {
      this.snackBar.open('⚠ Not connected to chat yet.', 'Close', { duration: 2000 });
    }
  }).unsubscribe();
}



  startPomodoro() {
    this.pomodoroActive = true;
    this.pomodoroInterval = setInterval(() => {
      if (this.pomodoroTime > 0) {
        this.pomodoroTime--;
      } else {
        this.pausePomodoro();
        this.snackBar.open('Pomodoro session completed!', 'Close', { duration: 5000 });
      }
    }, 1000);
  }

  pausePomodoro() {
    this.pomodoroActive = false;
    if (this.pomodoroInterval) {
      clearInterval(this.pomodoroInterval);
    }
  }

  resetPomodoro() {
    this.pausePomodoro();
    this.setPomodoroMode(this.pomodoroMode);
  }

  setPomodoroMode(mode: string) {
    this.pomodoroMode = mode;
    switch (mode) {
      case 'work':
        this.pomodoroTime = 1500; // 25 minutes
        break;
      case 'break':
        this.pomodoroTime = 300; // 5 minutes
        break;
      case 'longBreak':
        this.pomodoroTime = 900; // 15 minutes
        break;
    }
  }

  formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'active': return 'primary';
      case 'idle': return 'accent';
      case 'away': return 'warn';
      default: return 'primary';
    }
  }

  copyRoomCode() {
    if (this.room) {
      navigator.clipboard.writeText(this.room.code);
      this.snackBar.open('Room code copied to clipboard!', 'Close', { duration: 2000 });
    }
  }

  shareRoom() {
    if (this.room) {
      const url = `${window.location.origin}/room/${this.room.code}`;
      navigator.clipboard.writeText(url);
      this.snackBar.open('Room link copied to clipboard!', 'Close', { duration: 2000 });
    }
  }

  sendReminder() {
    if (this.room) {
      this.signalR.invoke('SendReminder', this.room.code, 'Time to focus!');
      this.snackBar.open('Reminder sent to all participants!', 'Close', { duration: 2000 });
    }
  }

  knockKnock() {
    if (this.room) {
      this.signalR.invoke('KnockKnock', this.room.code, 'all');
      this.snackBar.open('Knock knock sent!', 'Close', { duration: 2000 });
    }
  }

  leaveRoom() {
    if (this.room) {
      this.api.post('room/leave', { code: this.room.code }).subscribe({
        next: () => {
          this.snackBar.open('Left room successfully', 'Close', { duration: 2000 });
          this.router.navigate(['/room']);
        },
        error: () => {
          this.snackBar.open('Failed to leave room', 'Close', { duration: 2000 });
        }
      });
    }
  }
} 