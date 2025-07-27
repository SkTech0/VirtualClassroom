import { Component, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { PrimaryButtonComponent } from '../../shared/button/primary-button.component';

interface Room {
  id: string;
  code: string;
  subject: string;
  hostUsername: string;
  isActive: boolean;
  createdAt: string;
  participantCount?: number;
}

@Component({
  selector: 'app-room-list',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatDialogModule,
    MatDividerModule,
    MatProgressSpinnerModule,
    PrimaryButtonComponent
  ],
  template: `
    <div class="room-list-container">
      <!-- Welcome Section -->
      <div class="welcome-section">
        <h1>Welcome to Virtual Classroom</h1>
        <p>Create or join study rooms to collaborate with others</p>
      </div>

      <!-- Quick Actions -->
      <div class="quick-actions">
        <mat-card class="action-card create-card">
          <mat-card-header>
            <mat-card-title>
              <mat-icon>add_circle</mat-icon>
              Create New Room
            </mat-card-title>
            <mat-card-subtitle>Start a new study session</mat-card-subtitle>
          </mat-card-header>
          <mat-card-content>
            <form [formGroup]="createForm" (ngSubmit)="onCreateRoom()">
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Subject/Topic</mat-label>
                <input matInput formControlName="subject" placeholder="e.g., Mathematics, Programming, etc." />
                <mat-icon matSuffix>school</mat-icon>
              </mat-form-field>
              <button mat-raised-button color="primary" type="submit" [disabled]="createForm.invalid || creating" class="full-width">
                <mat-spinner diameter="20" *ngIf="creating"></mat-spinner>
                <span *ngIf="!creating">Create Room</span>
              </button>
            </form>
          </mat-card-content>
        </mat-card>

        <mat-card class="action-card join-card">
          <mat-card-header>
            <mat-card-title>
              <mat-icon>group_add</mat-icon>
              Join Room
            </mat-card-title>
            <mat-card-subtitle>Enter an existing study room</mat-card-subtitle>
          </mat-card-header>
          <mat-card-content>
            <form [formGroup]="joinForm" (ngSubmit)="onJoinRoom()">
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Room Code</mat-label>
                <input matInput formControlName="code" placeholder="Enter 6-digit code" maxlength="6" />
                <mat-icon matSuffix>meeting_room</mat-icon>
              </mat-form-field>
              <button mat-raised-button color="accent" type="submit" [disabled]="joinForm.invalid || joining" class="full-width">
                <mat-spinner diameter="20" *ngIf="joining"></mat-spinner>
                <span *ngIf="!joining">Join Room</span>
              </button>
            </form>
          </mat-card-content>
        </mat-card>
      </div>

      <!-- Recent Rooms -->
      <div class="recent-rooms" *ngIf="rooms.length > 0">
        <h2>Recent Rooms</h2>
        <div class="rooms-grid">
          <mat-card class="room-card" *ngFor="let room of rooms" (click)="goToRoom(room.code)">
            <mat-card-header>
              <mat-card-title>{{ room.subject || 'Untitled Room' }}</mat-card-title>
              <mat-card-subtitle>
                <mat-icon>person</mat-icon>
                {{ room.hostUsername }}
              </mat-card-subtitle>
            </mat-card-header>
            <mat-card-content>
              <div class="room-code">
                <mat-chip color="primary" selected>
                  <mat-icon>code</mat-icon>
                  {{ room.code }}
                </mat-chip>
              </div>
              <div class="room-status">
                <mat-chip [color]="room.isActive ? 'accent' : 'warn'" selected>
                  <mat-icon>{{ room.isActive ? 'radio_button_checked' : 'radio_button_unchecked' }}</mat-icon>
                  {{ room.isActive ? 'Active' : 'Inactive' }}
                </mat-chip>
              </div>
            </mat-card-content>
            <mat-card-actions>
              <button mat-button color="primary" (click)="goToRoom(room.code); $event.stopPropagation()">
                <mat-icon>enter</mat-icon>
                Enter Room
              </button>
              <button mat-button color="warn" (click)="leaveRoom(room.code); $event.stopPropagation()">
                <mat-icon>exit_to_app</mat-icon>
                Leave
              </button>
            </mat-card-actions>
          </mat-card>
        </div>
      </div>

      <!-- Empty State -->
      <div class="empty-state" *ngIf="rooms.length === 0 && !loading">
        <mat-card class="empty-card">
          <mat-card-content>
            <mat-icon class="empty-icon">meeting_room</mat-icon>
            <h3>No Rooms Yet</h3>
            <p>Create your first study room or join an existing one to get started!</p>
          </mat-card-content>
        </mat-card>
      </div>

      <!-- Loading State -->
      <div class="loading-state" *ngIf="loading">
        <mat-card class="loading-card">
          <mat-card-content>
            <mat-spinner diameter="50"></mat-spinner>
            <p>Loading your rooms...</p>
          </mat-card-content>
        </mat-card>
      </div>
    </div>
  `,
  styles: [`
    .room-list-container {
      max-width: 1200px;
      margin: 0 auto;
    }

    .welcome-section {
      text-align: center;
      margin-bottom: 3rem;
      color: white;
    }

    .welcome-section h1 {
      font-size: 2.5rem;
      font-weight: 700;
      margin-bottom: 0.5rem;
      text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
    }

    .welcome-section p {
      font-size: 1.2rem;
      opacity: 0.9;
    }

    .quick-actions {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 2rem;
      margin-bottom: 3rem;
    }

    .action-card {
      background: rgba(255, 255, 255, 0.95);
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.2);
      transition: transform 0.3s ease, box-shadow 0.3s ease;
    }

    .action-card:hover {
      transform: translateY(-5px);
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
    }

    .create-card {
      border-left: 4px solid #4caf50;
    }

    .join-card {
      border-left: 4px solid #ff9800;
    }

    .full-width {
      width: 100%;
    }

    .recent-rooms {
      margin-bottom: 2rem;
    }

    .recent-rooms h2 {
      color: white;
      font-size: 1.8rem;
      margin-bottom: 1.5rem;
      text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
    }

    .rooms-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 1.5rem;
    }

    .room-card {
      background: rgba(255, 255, 255, 0.95);
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.2);
      transition: transform 0.3s ease, box-shadow 0.3s ease;
      cursor: pointer;
    }

    .room-card:hover {
      transform: translateY(-3px);
      box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
    }

    .room-code {
      margin: 1rem 0;
    }

    .room-status {
      margin-bottom: 1rem;
    }

    .empty-state, .loading-state {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 300px;
    }

    .empty-card, .loading-card {
      background: rgba(255, 255, 255, 0.95);
      backdrop-filter: blur(10px);
      text-align: center;
      padding: 3rem;
    }

    .empty-icon {
      font-size: 4rem;
      width: 4rem;
      height: 4rem;
      color: #ccc;
      margin-bottom: 1rem;
    }

    .empty-card h3 {
      color: #666;
      margin-bottom: 0.5rem;
    }

    .empty-card p {
      color: #999;
    }

    .loading-card p {
      margin-top: 1rem;
      color: #666;
    }

    @media (max-width: 768px) {
      .quick-actions {
        grid-template-columns: 1fr;
        gap: 1rem;
      }

      .rooms-grid {
        grid-template-columns: 1fr;
      }

      .welcome-section h1 {
        font-size: 2rem;
      }

      .welcome-section p {
        font-size: 1rem;
      }
    }
  `]
})
export class RoomListComponent implements OnInit {
  joinForm;
  createForm;
  joining = false;
  creating = false;
  loading = false;
  rooms: Room[] = [];

  constructor(
    private fb: FormBuilder,
    private api: ApiService,
    private auth: AuthService,
    private router: Router,
    private snackBar: MatSnackBar,
    private dialog: MatDialog
  ) {
    this.joinForm = this.fb.group({ 
      code: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(6)]] 
    });
    this.createForm = this.fb.group({ 
      subject: ['', Validators.required] 
    });
  }

  ngOnInit() {
    this.loadRooms();
  }

  loadRooms() {
    this.loading = true;
    // For now, we'll create some mock data since the API might not have this endpoint
    setTimeout(() => {
      this.rooms = [
        {
          id: '1',
          code: 'ABC123',
          subject: 'Mathematics',
          hostUsername: 'John Doe',
          isActive: true,
          createdAt: new Date().toISOString(),
          participantCount: 5
        },
        {
          id: '2',
          code: 'DEF456',
          subject: 'Programming',
          hostUsername: 'Jane Smith',
          isActive: true,
          createdAt: new Date().toISOString(),
          participantCount: 3
        }
      ];
      this.loading = false;
    }, 1000);
  }

  onJoinRoom() {
    if (this.joinForm.invalid) return;
    this.joining = true;
    
    const codeValue = this.joinForm.value.code;
    if (!codeValue) {
      this.joining = false;
      this.snackBar.open('Please enter a room code', 'Close', { duration: 3000 });
      return;
    }
    
    const code = codeValue.toUpperCase();
    
    this.api.post<any>('room/join', { code }).subscribe({
      next: () => {
        this.joining = false;
        this.snackBar.open('Successfully joined room!', 'Close', { duration: 3000 });
        this.router.navigate(['/room', code]);
      },
      error: err => {
        this.joining = false;
        this.snackBar.open(err.error?.error || 'Failed to join room', 'Close', { duration: 3000 });
      }
    });
  }

  onCreateRoom() {
    if (this.createForm.invalid) return;
    this.creating = true;
    
    this.api.post<Room>('room/create', { subject: this.createForm.value.subject }).subscribe({
      next: room => {
        this.creating = false;
        this.snackBar.open('Room created successfully!', 'Close', { duration: 3000 });
        this.rooms.unshift(room);
        this.createForm.reset();
        this.router.navigate(['/room', room.code]);
      },
      error: err => {
        this.creating = false;
        this.snackBar.open(err.error?.error || 'Failed to create room', 'Close', { duration: 3000 });
      }
    });
  }

  goToRoom(code: string) {
    this.router.navigate(['/room', code]);
  }

  leaveRoom(code: string) {
    this.api.post('room/leave', { code }).subscribe({
      next: () => {
        this.rooms = this.rooms.filter(room => room.code !== code);
        this.snackBar.open('Left room successfully', 'Close', { duration: 3000 });
      },
      error: err => {
        this.snackBar.open(err.error?.error || 'Failed to leave room', 'Close', { duration: 3000 });
      }
    });
  }
}