import { Component, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { API_ENDPOINTS } from '../../core/constants/api-endpoints';
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
    MatProgressSpinnerModule
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
      subject: ['', [Validators.required, Validators.maxLength(200)]] 
    });
  }

  ngOnInit() {
    this.loadRooms();
  }

  loadRooms() {
    this.loading = true;
    this.api.get<Room[]>(API_ENDPOINTS.rooms.mine).subscribe({
      next: rooms => {
        this.rooms = (rooms ?? []).map(r => ({
          id: r.id,
          code: r.code,
          subject: r.subject ?? '',
          hostUsername: r.hostUsername ?? 'Host',
          isActive: r.isActive,
          createdAt: r.createdAt,
          participantCount: r.participantCount ?? 0
        }));
        this.loading = false;
      },
      error: err => {
        this.loading = false;
        this.rooms = [];
        this.snackBar.open(ApiService.getApiErrorMessage(err, 'Failed to load rooms'), 'Close', { duration: 3000 });
      }
    });
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
    
    this.api.post<any>(API_ENDPOINTS.rooms.join, { code }).subscribe({
      next: () => {
        this.joining = false;
        this.snackBar.open('Successfully joined room!', 'Close', { duration: 3000 });
        this.router.navigate(['/room', code]);
      },
      error: err => {
        this.joining = false;
        this.snackBar.open(ApiService.getApiErrorMessage(err, 'Failed to join room'), 'Close', { duration: 3000 });
      }
    });
  }

  onCreateRoom() {
    if (this.createForm.invalid) return;
    this.creating = true;
    
    this.api.post<Room>(API_ENDPOINTS.rooms.create, { subject: this.createForm.value.subject }).subscribe({
      next: room => {
        this.creating = false;
        this.snackBar.open('Room created successfully!', 'Close', { duration: 3000 });
        this.rooms.unshift({
          id: room.id,
          code: room.code,
          subject: room.subject ?? '',
          hostUsername: room.hostUsername ?? 'Host',
          isActive: room.isActive,
          createdAt: room.createdAt,
          participantCount: room.participantCount ?? 0
        });
        this.createForm.reset();
        this.router.navigate(['/room', room.code]);
      },
      error: err => {
        this.creating = false;
        this.snackBar.open(ApiService.getApiErrorMessage(err, 'Failed to create room'), 'Close', { duration: 3000 });
      }
    });
  }

  goToRoom(code: string) {
    this.router.navigate(['/room', code]);
  }

  leaveRoom(code: string) {
    this.api.post(API_ENDPOINTS.rooms.leave, { roomCode: code }).subscribe({
      next: () => {
        this.rooms = this.rooms.filter(room => room.code !== code);
        this.snackBar.open('Left room successfully', 'Close', { duration: 3000 });
      },
      error: err => {
        this.snackBar.open(ApiService.getApiErrorMessage(err, 'Failed to leave room'), 'Close', { duration: 3000 });
      }
    });
  }
}