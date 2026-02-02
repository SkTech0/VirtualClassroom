import { Component, OnInit } from '@angular/core';
import { ApiService } from '../../core/services/api.service';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { MatButtonModule } from '@angular/material/button';
import { MatTabsModule } from '@angular/material/tabs';

interface LeaderboardEntry {
  id: string;
  username: string;
  email: string;
  totalFocusMinutes: number;
  totalPomodoros: number;
  averageSessionLength: number;
  streakDays: number;
  rank: number;
}

@Component({
  selector: 'app-leaderboard',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatChipsModule,
    MatButtonModule,
    MatTabsModule
  ],
  templateUrl: './leaderboard.component.html',
  styleUrls: ['./leaderboard.component.css'],
})
export class LeaderboardComponent implements OnInit {
  leaderboardByMinutes: LeaderboardEntry[] = [];
  leaderboardByPomodoros: LeaderboardEntry[] = [];
  leaderboardByStreaks: LeaderboardEntry[] = [];
  loading = false;
  currentUser: any = null;

  // Stats
  totalFocusMinutes = 0;
  totalPomodoros = 0;
  averageSessionLength = 0;
  maxStreak = 0;

  constructor(private api: ApiService) {}

  ngOnInit() {
    this.loadLeaderboard();
    this.currentUser = JSON.parse(localStorage.getItem('user') || 'null');
  }

  loadLeaderboard() {
    this.loading = true;
    // No leaderboard API yet; show empty state. Data will appear when backend supports it.
    this.leaderboardByMinutes = [];
    this.leaderboardByPomodoros = [];
    this.leaderboardByStreaks = [];
    this.totalFocusMinutes = 0;
    this.totalPomodoros = 0;
    this.averageSessionLength = 0;
    this.maxStreak = 0;
    this.loading = false;
  }
} 