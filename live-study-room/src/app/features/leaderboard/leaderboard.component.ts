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
  template: `
    <div class="leaderboard-container">
      <!-- Header -->
      <div class="leaderboard-header">
        <h1>Leaderboard</h1>
        <p>See who's leading the way in focused learning</p>
      </div>

      <!-- Stats Cards -->
      <div class="stats-grid">
        <mat-card class="stat-card">
          <mat-card-content>
            <div class="stat-icon">
              <mat-icon>timer</mat-icon>
            </div>
            <div class="stat-info">
              <h3>{{ totalFocusMinutes }}</h3>
              <p>Total Focus Minutes</p>
            </div>
          </mat-card-content>
        </mat-card>

        <mat-card class="stat-card">
          <mat-card-content>
            <div class="stat-icon">
              <mat-icon>local_fire_department</mat-icon>
            </div>
            <div class="stat-info">
              <h3>{{ totalPomodoros }}</h3>
              <p>Total Pomodoros</p>
            </div>
          </mat-card-content>
        </mat-card>

        <mat-card class="stat-card">
          <mat-card-content>
            <div class="stat-icon">
              <mat-icon>trending_up</mat-icon>
            </div>
            <div class="stat-info">
              <h3>{{ averageSessionLength }}m</h3>
              <p>Avg Session Length</p>
            </div>
          </mat-card-content>
        </mat-card>

        <mat-card class="stat-card">
          <mat-card-content>
            <div class="stat-icon">
              <mat-icon>whatshot</mat-icon>
            </div>
            <div class="stat-info">
              <h3>{{ maxStreak }}</h3>
              <p>Max Streak Days</p>
            </div>
          </mat-card-content>
        </mat-card>
      </div>

      <!-- Leaderboard Tabs -->
      <mat-tab-group class="leaderboard-tabs">
        <mat-tab label="Focus Minutes">
          <div class="tab-content">
            <div class="leaderboard-list">
              <div class="leaderboard-item" *ngFor="let entry of leaderboardByMinutes; let i = index" 
                   [class.current-user]="entry.username === currentUser?.username">
                <div class="rank-badge" [class.top-3]="i < 3">
                  <span class="rank-number">{{ i + 1 }}</span>
                  <mat-icon *ngIf="i === 0" class="crown">emoji_events</mat-icon>
                  <mat-icon *ngIf="i === 1" class="silver">looks_two</mat-icon>
                  <mat-icon *ngIf="i === 2" class="bronze">looks_3</mat-icon>
                </div>
                
                <div class="user-info">
                  <div class="user-avatar">
                    <mat-icon>account_circle</mat-icon>
                  </div>
                  <div class="user-details">
                    <h4>{{ entry.username }}</h4>
                    <p>{{ entry.email }}</p>
                  </div>
                </div>

                <div class="user-stats">
                  <div class="stat-value">{{ entry.totalFocusMinutes }}m</div>
                  <div class="stat-label">Focus Time</div>
                </div>

                <div class="user-stats">
                  <div class="stat-value">{{ entry.totalPomodoros }}</div>
                  <div class="stat-label">Pomodoros</div>
                </div>

                <div class="user-stats">
                  <div class="stat-value">{{ entry.streakDays }}</div>
                  <div class="stat-label">Streak</div>
                </div>
              </div>
            </div>
          </div>
        </mat-tab>

        <mat-tab label="Pomodoros">
          <div class="tab-content">
            <div class="leaderboard-list">
              <div class="leaderboard-item" *ngFor="let entry of leaderboardByPomodoros; let i = index"
                   [class.current-user]="entry.username === currentUser?.username">
                <div class="rank-badge" [class.top-3]="i < 3">
                  <span class="rank-number">{{ i + 1 }}</span>
                  <mat-icon *ngIf="i === 0" class="crown">emoji_events</mat-icon>
                  <mat-icon *ngIf="i === 1" class="silver">looks_two</mat-icon>
                  <mat-icon *ngIf="i === 2" class="bronze">looks_3</mat-icon>
                </div>
                
                <div class="user-info">
                  <div class="user-avatar">
                    <mat-icon>account_circle</mat-icon>
                  </div>
                  <div class="user-details">
                    <h4>{{ entry.username }}</h4>
                    <p>{{ entry.email }}</p>
                  </div>
                </div>

                <div class="user-stats">
                  <div class="stat-value">{{ entry.totalPomodoros }}</div>
                  <div class="stat-label">Pomodoros</div>
                </div>

                <div class="user-stats">
                  <div class="stat-value">{{ entry.totalFocusMinutes }}m</div>
                  <div class="stat-label">Focus Time</div>
                </div>

                <div class="user-stats">
                  <div class="stat-value">{{ entry.averageSessionLength }}m</div>
                  <div class="stat-label">Avg Session</div>
                </div>
              </div>
            </div>
          </div>
        </mat-tab>

        <mat-tab label="Streaks">
          <div class="tab-content">
            <div class="leaderboard-list">
              <div class="leaderboard-item" *ngFor="let entry of leaderboardByStreaks; let i = index"
                   [class.current-user]="entry.username === currentUser?.username">
                <div class="rank-badge" [class.top-3]="i < 3">
                  <span class="rank-number">{{ i + 1 }}</span>
                  <mat-icon *ngIf="i === 0" class="crown">emoji_events</mat-icon>
                  <mat-icon *ngIf="i === 1" class="silver">looks_two</mat-icon>
                  <mat-icon *ngIf="i === 2" class="bronze">looks_3</mat-icon>
                </div>
                
                <div class="user-info">
                  <div class="user-avatar">
                    <mat-icon>account_circle</mat-icon>
                  </div>
                  <div class="user-details">
                    <h4>{{ entry.username }}</h4>
                    <p>{{ entry.email }}</p>
                  </div>
                </div>

                <div class="user-stats">
                  <div class="stat-value">{{ entry.streakDays }}</div>
                  <div class="stat-label">Streak Days</div>
                </div>

                <div class="user-stats">
                  <div class="stat-value">{{ entry.totalFocusMinutes }}m</div>
                  <div class="stat-label">Total Focus</div>
                </div>

                <div class="user-stats">
                  <div class="stat-value">{{ entry.totalPomodoros }}</div>
                  <div class="stat-label">Pomodoros</div>
                </div>
              </div>
            </div>
          </div>
        </mat-tab>
      </mat-tab-group>

      <!-- Loading State -->
      <div class="loading-state" *ngIf="loading">
        <mat-card class="loading-card">
          <mat-card-content>
            <mat-spinner diameter="50"></mat-spinner>
            <p>Loading leaderboard...</p>
          </mat-card-content>
        </mat-card>
      </div>
    </div>
  `,
  styles: [`
    .leaderboard-container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 2rem;
    }

    .leaderboard-header {
      text-align: center;
      margin-bottom: 3rem;
      color: white;
    }

    .leaderboard-header h1 {
      font-size: 2.5rem;
      font-weight: 700;
      margin-bottom: 0.5rem;
      text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
    }

    .leaderboard-header p {
      font-size: 1.2rem;
      opacity: 0.9;
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 1.5rem;
      margin-bottom: 3rem;
    }

    .stat-card {
      background: rgba(255, 255, 255, 0.95);
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.2);
      transition: transform 0.3s ease, box-shadow 0.3s ease;
    }

    .stat-card:hover {
      transform: translateY(-5px);
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
    }

    .stat-card mat-card-content {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 1.5rem;
    }

    .stat-icon {
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
    }

    .stat-icon mat-icon {
      font-size: 2rem;
      width: 2rem;
      height: 2rem;
    }

    .stat-info h3 {
      margin: 0;
      font-size: 2rem;
      font-weight: 700;
      color: #333;
    }

    .stat-info p {
      margin: 0;
      color: #666;
      font-size: 0.9rem;
    }

    .leaderboard-tabs {
      background: rgba(255, 255, 255, 0.95);
      backdrop-filter: blur(10px);
      border-radius: 12px;
      overflow: hidden;
    }

    .tab-content {
      padding: 2rem;
    }

    .leaderboard-list {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .leaderboard-item {
      display: flex;
      align-items: center;
      gap: 1.5rem;
      padding: 1rem;
      border-radius: 12px;
      background: #f8f9fa;
      transition: all 0.3s ease;
      border: 2px solid transparent;
    }

    .leaderboard-item:hover {
      background: #e9ecef;
      transform: translateX(5px);
    }

    .leaderboard-item.current-user {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border-color: #667eea;
    }

    .rank-badge {
      width: 50px;
      height: 50px;
      border-radius: 50%;
      background: #dee2e6;
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
      font-weight: 700;
      font-size: 1.2rem;
    }

    .rank-badge.top-3 {
      background: linear-gradient(135deg, #ffd700 0%, #ffed4e 100%);
      color: #333;
    }

    .rank-badge.top-3:nth-child(2) {
      background: linear-gradient(135deg, #c0c0c0 0%, #e5e5e5 100%);
    }

    .rank-badge.top-3:nth-child(3) {
      background: linear-gradient(135deg, #cd7f32 0%, #daa520 100%);
    }

    .crown {
      position: absolute;
      top: -10px;
      right: -10px;
      font-size: 1.5rem;
      color: #ffd700;
    }

    .silver, .bronze {
      position: absolute;
      top: -5px;
      right: -5px;
      font-size: 1rem;
    }

    .user-info {
      display: flex;
      align-items: center;
      gap: 1rem;
      flex: 1;
    }

    .user-avatar {
      width: 50px;
      height: 50px;
      border-radius: 50%;
      background: #e9ecef;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .user-avatar mat-icon {
      font-size: 2rem;
      color: #6c757d;
    }

    .user-details h4 {
      margin: 0;
      font-size: 1.1rem;
      font-weight: 600;
    }

    .user-details p {
      margin: 0;
      font-size: 0.9rem;
      opacity: 0.7;
    }

    .user-stats {
      text-align: center;
      min-width: 80px;
    }

    .stat-value {
      font-size: 1.2rem;
      font-weight: 700;
      margin-bottom: 0.25rem;
    }

    .stat-label {
      font-size: 0.8rem;
      opacity: 0.7;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .loading-state {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 300px;
    }

    .loading-card {
      background: rgba(255, 255, 255, 0.95);
      backdrop-filter: blur(10px);
      text-align: center;
      padding: 3rem;
    }

    .loading-card p {
      margin-top: 1rem;
      color: #666;
    }

    @media (max-width: 768px) {
      .leaderboard-container {
        padding: 1rem;
      }

      .stats-grid {
        grid-template-columns: 1fr;
      }

      .leaderboard-item {
        flex-direction: column;
        text-align: center;
        gap: 1rem;
      }

      .user-info {
        flex-direction: column;
      }

      .user-stats {
        display: flex;
        gap: 1rem;
        justify-content: center;
      }
    }
  `]
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