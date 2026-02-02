import { Component, OnInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule, RouterModule, MatButtonModule, MatCardModule, MatIconModule],
  templateUrl: './landing.component.html',
  styleUrls: ['./landing.component.css'],
})
export class LandingComponent implements OnInit {
  currentYear = new Date().getFullYear();

  constructor(
    private router: Router,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {}

  navigateToAuth(): void {
    this.router.navigate(['/auth/login']);
  }

  showDemo(): void {
    this.snackBar.open('Demo video coming soon! In the meantime: Sign up → Create or join a room → Use Chat, Pomodoro, and Video Call.', 'Close', { duration: 6000 });
  }
} 