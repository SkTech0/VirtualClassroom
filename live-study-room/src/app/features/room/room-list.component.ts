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
  templateUrl: './room-list.component.html',
  styleUrls: ['./room-list.component.css'],
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