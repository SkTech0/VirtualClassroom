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
  template: `
    <div class="room-container" *ngIf="room; else loading">
      <!-- Room Header -->
      <div class="room-header">
        <div class="room-info">
          <div class="room-title">
            <h1>{{ room.subject || 'Untitled Room' }}</h1>
            <mat-chip color="primary" selected class="room-code">
              <mat-icon>code</mat-icon>
              {{ room.code }}
            </mat-chip>
          </div>
          <div class="room-meta">
            <span class="host-info">
              <mat-icon>person</mat-icon>
              Host: {{ room.hostUsername }}
            </span>
            <span class="participant-count">
              <mat-icon>group</mat-icon>
              {{ participants.length }} participants
            </span>
          </div>
        </div>
        
        <div class="room-actions">
          <button mat-icon-button [matMenuTriggerFor]="roomMenu" matTooltip="Room options">
            <mat-icon>more_vert</mat-icon>
          </button>
          <mat-menu #roomMenu="matMenu">
            <button mat-menu-item (click)="copyRoomCode()">
              <mat-icon>content_copy</mat-icon>
              <span>Copy Room Code</span>
            </button>
            <button mat-menu-item (click)="shareRoom()">
              <mat-icon>share</mat-icon>
              <span>Share Room</span>
            </button>
            <mat-divider></mat-divider>
            <button mat-menu-item color="warn" (click)="leaveRoom()">
              <mat-icon>exit_to_app</mat-icon>
              <span>Leave Room</span>
            </button>
          </mat-menu>
        </div>
      </div>

      <!-- Main Content -->
      <div class="room-content">
        <!-- Left Sidebar - Participants -->
        <div class="sidebar participants-sidebar">
          <mat-card class="sidebar-card">
            <mat-card-header>
              <mat-card-title>
                <mat-icon>group</mat-icon>
                Participants
              </mat-card-title>
            </mat-card-header>
            <mat-card-content>
              <mat-list>
                <mat-list-item *ngFor="let participant of participants" class="participant-item">
                  <div class="participant-avatar">
                    <mat-icon>account_circle</mat-icon>
                  </div>
                  <div class="participant-info">
                    <div class="participant-name">
                      {{ participant.name }}
                      <mat-icon *ngIf="participant.isHost" class="host-icon" matTooltip="Room Host">star</mat-icon>
                    </div>
                    <div class="participant-email">{{ participant.email }}</div>
                  </div>
                  <mat-chip *ngIf="participant.status" [color]="getStatusColor(participant.status)" selected class="status-chip">
                    {{ participant.status }}
                  </mat-chip>
                </mat-list-item>
              </mat-list>
            </mat-card-content>
          </mat-card>
        </div>

        <!-- Main Area -->
        <div class="main-area">
          <mat-tab-group class="room-tabs">
            <!-- Chat Tab -->
            <mat-tab label="Chat">
              <div class="tab-content">
                <mat-card class="chat-card">
                  <mat-card-content>
                    <div class="chat-messages">
                      <div class="message" *ngFor="let message of chatMessages">
                        <div class="message-header">
                          <strong>{{ message.sender }}</strong>
                          <span class="message-time">{{ message.timestamp | date:'shortTime' }}</span>
                        </div>
                        <div class="message-content">{{ message.content }}</div>
                      </div>
                    </div>
                    <mat-divider></mat-divider>
                    <div class="chat-input">
                      <mat-form-field appearance="outline" class="full-width">
                        <mat-label>Type a message...</mat-label>
                        <input matInput [(ngModel)]="newMessage" (keyup.enter)="sendMessage()" placeholder="Press Enter to send" />
                        <mat-icon matSuffix>send</mat-icon>
                      </mat-form-field>
                      <button mat-icon-button color="primary" (click)="sendMessage()" [disabled]="!newMessage.trim()">
                        <mat-icon>send</mat-icon>
                      </button>
                    </div>
                  </mat-card-content>
                </mat-card>
              </div>
            </mat-tab>

            <!-- Pomodoro Tab -->
            <mat-tab label="Pomodoro">
              <div class="tab-content">
                <mat-card class="pomodoro-card">
                  <mat-card-content>
                    <div class="pomodoro-timer">
                      <div class="timer-display">
                        <span class="timer">{{ formatTime(pomodoroTime) }}</span>
                        <div class="timer-controls">
                          <button mat-fab color="primary" (click)="startPomodoro()" *ngIf="!pomodoroActive">
                            <mat-icon>play_arrow</mat-icon>
                          </button>
                          <button mat-fab color="warn" (click)="pausePomodoro()" *ngIf="pomodoroActive">
                            <mat-icon>pause</mat-icon>
                          </button>
                          <button mat-fab color="accent" (click)="resetPomodoro()">
                            <mat-icon>refresh</mat-icon>
                          </button>
                        </div>
                      </div>
                      <div class="pomodoro-mode">
                        <div class="mode-chips">
                          <mat-chip [color]="pomodoroMode === 'work' ? 'primary' : 'default'" (click)="setPomodoroMode('work')">Work (25m)</mat-chip>
                          <mat-chip [color]="pomodoroMode === 'break' ? 'primary' : 'default'" (click)="setPomodoroMode('break')">Break (5m)</mat-chip>
                          <mat-chip [color]="pomodoroMode === 'longBreak' ? 'primary' : 'default'" (click)="setPomodoroMode('longBreak')">Long Break (15m)</mat-chip>
                        </div>
                      </div>
                    </div>
                  </mat-card-content>
                </mat-card>
              </div>
            </mat-tab>

            <!-- Leaderboard Tab -->
            <mat-tab label="Leaderboard">
              <div class="tab-content">
                <mat-card class="leaderboard-card">
                  <mat-card-content>
                    <mat-list>
                      <mat-list-item *ngFor="let entry of leaderboard; let i = index" class="leaderboard-item">
                        <div class="rank">{{ i + 1 }}</div>
                        <div class="user-avatar">
                          <mat-icon>account_circle</mat-icon>
                        </div>
                        <div class="user-info">
                          <div class="user-name">{{ entry.username }}</div>
                          <div class="user-stats">{{ entry.focusMinutes }} minutes focused</div>
                        </div>
                        <div class="score">{{ entry.pomodoros }} pomodoros</div>
                      </mat-list-item>
                    </mat-list>
                  </mat-card-content>
                </mat-card>
              </div>
            </mat-tab>
          </mat-tab-group>
        </div>

        <!-- Right Sidebar - Quick Actions -->
        <div class="sidebar actions-sidebar">
          <mat-card class="sidebar-card">
            <mat-card-header>
              <mat-card-title>
                <mat-icon>flash_on</mat-icon>
                Quick Actions
              </mat-card-title>
            </mat-card-header>
            <mat-card-content>
              <div class="quick-actions">
                <button mat-raised-button color="primary" class="action-btn" (click)="startPomodoro()">
                  <mat-icon>timer</mat-icon>
                  Start Pomodoro
                </button>
                <button mat-raised-button color="accent" class="action-btn" (click)="sendReminder()">
                  <mat-icon>notifications</mat-icon>
                  Send Reminder
                </button>
                <button mat-raised-button color="warn" class="action-btn" (click)="knockKnock()">
                  <mat-icon>knock</mat-icon>
                  Knock Knock
                </button>
              </div>
            </mat-card-content>
          </mat-card>
        </div>
      </div>
    </div>

    <ng-template #loading>
      <div class="loading-container">
        <mat-card class="loading-card">
          <mat-card-content>
            <mat-spinner diameter="50"></mat-spinner>
            <p>Loading room...</p>
          </mat-card-content>
        </mat-card>
      </div>
    </ng-template>
  `,
  styles: [`
    .room-container {
      height: calc(100vh - 70px);
      display: flex;
      flex-direction: column;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    }

    .room-header {
      background: rgba(255, 255, 255, 0.95);
      backdrop-filter: blur(10px);
      padding: 1rem 2rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid rgba(255, 255, 255, 0.2);
    }

    .room-title {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .room-title h1 {
      margin: 0;
      color: #333;
      font-size: 1.8rem;
    }

    .room-code {
      font-size: 0.9rem;
    }

    .room-meta {
      display: flex;
      gap: 1rem;
      margin-top: 0.5rem;
      color: #666;
      font-size: 0.9rem;
    }

    .room-meta span {
      display: flex;
      align-items: center;
      gap: 0.25rem;
    }

    .room-actions {
      display: flex;
      gap: 0.5rem;
    }

    .room-content {
      flex: 1;
      display: grid;
      grid-template-columns: 250px 1fr 250px;
      gap: 1rem;
      padding: 1rem;
      overflow: hidden;
    }

    .sidebar {
      display: flex;
      flex-direction: column;
    }

    .sidebar-card {
      background: rgba(255, 255, 255, 0.95);
      backdrop-filter: blur(10px);
      height: fit-content;
    }

    .main-area {
      background: rgba(255, 255, 255, 0.95);
      backdrop-filter: blur(10px);
      border-radius: 12px;
      overflow: hidden;
    }

    .room-tabs {
      height: 100%;
    }

    .tab-content {
      height: calc(100vh - 200px);
      padding: 1rem;
      overflow-y: auto;
    }

    .chat-card, .pomodoro-card, .leaderboard-card {
      height: 100%;
      display: flex;
      flex-direction: column;
    }

    .chat-messages {
      flex: 1;
      overflow-y: auto;
      padding: 1rem;
      max-height: 400px;
    }

    .message {
      margin-bottom: 1rem;
      padding: 0.5rem;
      border-radius: 8px;
      background: #f5f5f5;
    }

    .message-header {
      display: flex;
      justify-content: space-between;
      margin-bottom: 0.25rem;
      font-size: 0.9rem;
    }

    .message-time {
      color: #666;
      font-size: 0.8rem;
    }

    .chat-input {
      display: flex;
      gap: 0.5rem;
      align-items: center;
      padding: 1rem;
    }

    .full-width {
      width: 100%;
    }

    .pomodoro-timer {
      text-align: center;
      padding: 2rem;
    }

    .timer-display {
      margin-bottom: 2rem;
    }

    .timer {
      font-size: 4rem;
      font-weight: 700;
      color: #333;
      display: block;
      margin-bottom: 1rem;
    }

    .timer-controls {
      display: flex;
      justify-content: center;
      gap: 1rem;
    }

    .pomodoro-mode {
      margin-top: 2rem;
    }

    .mode-chips {
      display: flex;
      gap: 0.5rem;
      justify-content: center;
      flex-wrap: wrap;
    }

    .participant-item {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 0.5rem 0;
      border-bottom: 1px solid #eee;
    }

    .participant-avatar {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: #f0f0f0;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .participant-info {
      flex: 1;
    }

    .participant-name {
      font-weight: 500;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .participant-email {
      font-size: 0.8rem;
      color: #666;
    }

    .host-icon {
      color: #ffd700;
      font-size: 1rem;
    }

    .status-chip {
      font-size: 0.8rem;
    }

    .quick-actions {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .action-btn {
      justify-content: flex-start;
      padding: 0.75rem 1rem;
    }

    .leaderboard-item {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 0.5rem 0;
    }

    .rank {
      font-size: 1.2rem;
      font-weight: 700;
      color: #667eea;
      min-width: 2rem;
    }

    .user-avatar {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: #f0f0f0;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .user-info {
      flex: 1;
    }

    .user-name {
      font-weight: 500;
    }

    .user-stats {
      font-size: 0.8rem;
      color: #666;
    }

    .score {
      color: #666;
      font-size: 0.9rem;
    }

    .loading-container {
      display: flex;
      justify-content: center;
      align-items: center;
      height: calc(100vh - 70px);
    }

    .loading-card {
      background: rgba(255, 255, 255, 0.95);
      backdrop-filter: blur(10px);
      text-align: center;
      padding: 3rem;
    }

    @media (max-width: 1200px) {
      .room-content {
        grid-template-columns: 200px 1fr 200px;
      }
    }

    @media (max-width: 768px) {
      .room-content {
        grid-template-columns: 1fr;
        gap: 0.5rem;
      }

      .sidebar {
        display: none;
      }

      .room-header {
        padding: 1rem;
      }

      .room-title h1 {
        font-size: 1.4rem;
      }

      .room-meta {
        flex-direction: column;
        gap: 0.25rem;
      }
    }
  `]
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

  setupSignalR(code: string) {
    const token = this.auth.getToken();
    if (token) {
      this.signalR.startConnection('http://localhost:5275/hubs/room', { accessTokenFactory: () => token });
    } else {
      this.signalR.startConnection('http://localhost:5275/hubs/room');
    }
    
    this.signalR.invoke('JoinRoomGroup', code);
    
    this.signalR.on('ParticipantsChanged', () => this.loadParticipants());
    this.signalR.on('MessageReceived', (message: any) => {
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
    
    const message = {
      content: this.newMessage,
      sender: this.auth.getUserFromStorage()?.username || 'Anonymous',
      timestamp: new Date()
    };
    
    this.chatMessages.push(message);
    this.signalR.invoke('SendMessage', this.room.code, message);
    this.newMessage = '';
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