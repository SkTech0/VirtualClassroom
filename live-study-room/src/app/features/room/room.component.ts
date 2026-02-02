// room.component.ts

import { Component, OnInit, OnDestroy } from '@angular/core';

import { ActivatedRoute, Router } from '@angular/router';

import { ApiService } from '../../core/services/api.service';
import { API_ENDPOINTS } from '../../core/constants/api-endpoints';

import { AuthService } from '../../core/services/auth.service';

import { SignalRService } from '../../core/services/signalr.service';

import { MatSnackBar } from '@angular/material/snack-bar';

import { MatDialog } from '@angular/material/dialog';

import { Subject } from 'rxjs';

import { CommonModule } from '@angular/common';

import { FormsModule } from '@angular/forms';

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

import { MatDialogModule } from '@angular/material/dialog';

import { takeUntil, filter, skip } from 'rxjs/operators';

import { ChatComponent } from '../chat/chat.component';
import { environment } from '../../../environments/environment';



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

    MatDialogModule,

    ChatComponent

  ],

  templateUrl: './room.component.html',

  styleUrls: ['./room.component.css'],

})

export class RoomComponent implements OnInit, OnDestroy {

  room: Room | null = null;

  participants: Participant[] = [];

  pomodoroTime = 1500;

  pomodoroActive = false;

  pomodoroMode = 'work';

  leaderboard: any[] = [];

  isVideoCallActive = false;

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

    clearInterval(this.pomodoroInterval);

    this.signalR.stopConnection();

  }

 

  loadRoom(code: string) {

    this.api.get<Room>(API_ENDPOINTS.rooms.byCode(code)).subscribe({

      next: room => {

        this.room = room;

        this.loadParticipants();

        this.loadLeaderboard();

      },

      error: err => {

        this.snackBar.open(ApiService.getApiErrorMessage(err, 'Failed to load room'), 'Close', { duration: 3000 });

        this.router.navigate(['/room']);

      }

    });

  }

 

  async setupSignalR(code: string) {

    const token = this.auth.getToken();

    try {

      await this.signalR.startConnection(environment.hubUrl, {

        accessTokenFactory: () => token || ''

      });

      await this.signalR.invoke('JoinRoomGroup', code);

    } catch (err) {

      console.error('JoinRoomGroup failed:', err);

      this.snackBar.open('Could not join room updates. Reconnecting...', 'Close', { duration: 3000 });

    }

    this.signalR.connectionState$.pipe(

      takeUntil(this.destroy$),

      filter(connected => connected),

      skip(1)

    ).subscribe(() => this.signalR.invoke('JoinRoomGroup', code).catch(() => {}));

 

    this.signalR.on('ParticipantsChanged', () => this.loadParticipants());

    this.signalR.on('ReminderReceived', (message: string) => {

      this.snackBar.open(message, 'Close', { duration: 5000 });

    });

    this.signalR.on('RoomClosed', () => {

      this.snackBar.open('Room has been closed.', 'Close', { duration: 4000 });

      this.signalR.stopConnection();

      this.router.navigate(['/room']);

    });

    this.signalR.on('UserDisconnected', () => this.loadParticipants());

    this.signalR.on('userdisconnected', () => this.loadParticipants());

  }

 

  loadParticipants() {

    if (!this.room) return;

    this.api.get<Participant[]>(API_ENDPOINTS.rooms.participants(this.room.code)).subscribe({

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

    this.leaderboard = [

      { username: 'John Doe', focusMinutes: 120, pomodoros: 4 },

      { username: 'Jane Smith', focusMinutes: 90, pomodoros: 3 },

      { username: 'Bob Johnson', focusMinutes: 60, pomodoros: 2 }

    ];

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

    clearInterval(this.pomodoroInterval);

  }

 

  resetPomodoro() {

    this.pausePomodoro();

    this.setPomodoroMode(this.pomodoroMode);

  }

 

  setPomodoroMode(mode: string) {

    this.pomodoroMode = mode;

    switch (mode) {

      case 'work': this.pomodoroTime = 1500; break;

      case 'break': this.pomodoroTime = 300; break;

      case 'longBreak': this.pomodoroTime = 900; break;

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

      this.signalR.invoke('SendKnockKnock', this.room.code, 'all', this.auth.getUserFromStorage()?.username ?? 'Unknown');

      this.snackBar.open('Knock knock sent!', 'Close', { duration: 2000 });

    }

  }

 

  startVideoCall() {

    const code = (this.room?.code ?? this.route.snapshot.paramMap.get('code') ?? '').toString().trim();
    if (!code) {
      this.snackBar.open('Room not loaded. Please wait or refresh.', 'Close', { duration: 3000 });
      return;
    }
    const videoUrl = '/video/' + encodeURIComponent(code);
    this.router.navigateByUrl(videoUrl).then(ok => {
      if (!ok) {
        this.snackBar.open('Could not open video call. Try again.', 'Close', { duration: 3000 });
      }
    });

  }

 

  joinVideoCall() {

    const code = (this.room?.code ?? this.route.snapshot.paramMap.get('code') ?? '').toString().trim();
    if (!code) {
      this.snackBar.open('Room not loaded. Please wait or refresh.', 'Close', { duration: 3000 });
      return;
    }
    this.router.navigateByUrl('/video/' + encodeURIComponent(code));

  }

 

  leaveRoom() {

    if (this.room) {

      this.api.post(API_ENDPOINTS.rooms.leave, { roomCode: this.room.code }).subscribe({

        next: () => {

          this.snackBar.open('Left room successfully', 'Close', { duration: 2000 });

          this.router.navigate(['/room']);

        },

        error: err => {

          this.snackBar.open(ApiService.getApiErrorMessage(err, 'Failed to leave room'), 'Close', { duration: 2000 });

        }

      });

    }

  }

}

 

