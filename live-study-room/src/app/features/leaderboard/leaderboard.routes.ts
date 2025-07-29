import { Routes } from '@angular/router';
import { LeaderboardComponent } from './leaderboard.component';
import { authGuard } from '../../core/guards/auth.guard'; // Add this import

export const leaderboardRoutes: Routes = [
  { path: '', component: LeaderboardComponent, canActivate: [authGuard] } // Add canActivate
];