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
    
    // Mock data for now - replace with actual API call
    setTimeout(() => {
      const mockData: LeaderboardEntry[] = [
        {
          id: '1',
          username: 'John Doe',
          email: 'john@example.com',
          totalFocusMinutes: 480,
          totalPomodoros: 16,
          averageSessionLength: 30,
          streakDays: 7,
          rank: 1
        },
        {
          id: '2',
          username: 'Jane Smith',
          email: 'jane@example.com',
          totalFocusMinutes: 360,
          totalPomodoros: 12,
          averageSessionLength: 25,
          streakDays: 5,
          rank: 2
        },
        {
          id: '3',
          username: 'Bob Johnson',
          email: 'bob@example.com',
          totalFocusMinutes: 300,
          totalPomodoros: 10,
          averageSessionLength: 20,
          streakDays: 3,
          rank: 3
        },
        {
          id: '4',
          username: 'Alice Brown',
          email: 'alice@example.com',
          totalFocusMinutes: 240,
          totalPomodoros: 8,
          averageSessionLength: 18,
          streakDays: 2,
          rank: 4
        }
      ];

      this.leaderboardByMinutes = [...mockData].sort((a, b) => b.totalFocusMinutes - a.totalFocusMinutes);
      this.leaderboardByPomodoros = [...mockData].sort((a, b) => b.totalPomodoros - a.totalPomodoros);
      this.leaderboardByStreaks = [...mockData].sort((a, b) => b.streakDays - a.streakDays);

      // Calculate stats
      this.totalFocusMinutes = mockData.reduce((sum, entry) => sum + entry.totalFocusMinutes, 0);
      this.totalPomodoros = mockData.reduce((sum, entry) => sum + entry.totalPomodoros, 0);
      this.averageSessionLength = Math.round(mockData.reduce((sum, entry) => sum + entry.averageSessionLength, 0) / mockData.length);
      this.maxStreak = Math.max(...mockData.map(entry => entry.streakDays));

      this.loading = false;
    }, 1000);
  }
} 