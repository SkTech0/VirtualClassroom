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
import { ConfirmModalComponent } from '../../shared/modal/confirm-modal.component';
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

    ChatComponent,

    ConfirmModalComponent

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

    // Shared Pomodoro: sync with hub so everyone in the room sees the same timer
    this.signalR.on<number>('TimerStarted', (durationSeconds: number) => {
      this.pomodoroTime = durationSeconds;
      this.pomodoroActive = true;
      clearInterval(this.pomodoroInterval);
      this.pomodoroInterval = setInterval(() => this.tickPomodoro(), 1000);
    });
    this.signalR.on('TimerPaused', () => {
      this.pomodoroActive = false;
      clearInterval(this.pomodoroInterval);
    });
    this.signalR.on('TimerResumed', () => {
      this.pomodoroActive = true;
      clearInterval(this.pomodoroInterval);
      this.pomodoroInterval = setInterval(() => this.tickPomodoro(), 1000);
    });
    this.signalR.on('TimerReset', () => {
      this.pomodoroActive = false;
      clearInterval(this.pomodoroInterval);
      this.setPomodoroMode(this.pomodoroMode);
    });
  }

  private tickPomodoro() {
    if (this.pomodoroTime > 0) {
      this.pomodoroTime--;
    } else {
      clearInterval(this.pomodoroInterval);
      this.pomodoroActive = false;
      this.snackBar.open('Pomodoro session completed!', 'Close', { duration: 5000 });
    }
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
    // Room leaderboard: no API yet; show empty state. Data will come from Pomodoro sessions.
    this.leaderboard = [];
  }

 

  startPomodoro() {
    if (!this.room?.code) return;
    this.signalR.invoke('StartTimer', this.room.code, this.pomodoroTime).catch(() => {
      this.snackBar.open('Could not sync timer. Try again.', 'Close', { duration: 3000 });
    });
  }

  pausePomodoro() {
    if (!this.room?.code) return;
    clearInterval(this.pomodoroInterval);
    this.pomodoroActive = false;
    this.signalR.invoke('PauseTimer', this.room.code).catch(() => {});
  }

  resumePomodoro() {
    if (!this.room?.code) return;
    this.signalR.invoke('ResumeTimer', this.room.code).catch(() => {});
  }

  resetPomodoro() {
    if (!this.room?.code) return;
    clearInterval(this.pomodoroInterval);
    this.pomodoroActive = false;
    this.setPomodoroMode(this.pomodoroMode);
    this.signalR.invoke('ResetTimer', this.room.code).catch(() => {});
  }

 

  setPomodoroMode(mode: string) {
    this.pomodoroMode = mode;
    switch (mode) {
      case 'work': this.pomodoroTime = 1500; break;
      case 'break': this.pomodoroTime = 300; break;
      case 'longBreak': this.pomodoroTime = 900; break;
    }
  }

  /** True if timer is at full duration for current mode (so "Start" not "Resume") */
  isPomodoroAtStart(): boolean {
    const full = this.pomodoroMode === 'work' ? 1500 : this.pomodoroMode === 'break' ? 300 : 900;
    return this.pomodoroTime >= full;
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
    if (!this.room) return;
    const url = `${window.location.origin}/room/${this.room.code}`;
    const title = this.room.subject || 'Study room';
    const text = `Join my study room "${title}" (code: ${this.room.code})`;
    if (typeof navigator.share === 'function') {
      navigator.share({ title, text, url }).then(() => {
        this.snackBar.open('Room link shared!', 'Close', { duration: 2000 });
      }).catch(() => {
        this.fallbackCopyShare(url);
      });
    } else {
      this.fallbackCopyShare(url);
    }
  }

  private fallbackCopyShare(url: string) {
    navigator.clipboard.writeText(url).then(() => {
      this.snackBar.open('Room link copied to clipboard!', 'Close', { duration: 2000 });
    });
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
    if (!this.room) return;
    const dialogRef = this.dialog.open(ConfirmModalComponent, {
      data: { message: 'Are you sure you want to leave this room? You can rejoin with the room code.' },
      width: '360px'
    });
    dialogRef.afterClosed().subscribe(confirmed => {
      if (!confirmed) return;
      this.api.post(API_ENDPOINTS.rooms.leave, { roomCode: this.room!.code }).subscribe({
        next: () => {
          this.snackBar.open('Left room successfully', 'Close', { duration: 2000 });
          this.router.navigate(['/room']);
        },
        error: err => {
          this.snackBar.open(ApiService.getApiErrorMessage(err, 'Failed to leave room'), 'Close', { duration: 3000 });
        }
      });
    });
  }

}

 

