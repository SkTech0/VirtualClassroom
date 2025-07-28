import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'landing',
    loadChildren: () => import('./features/landing/landing.routes').then(m => m.landingRoutes)
  },
  {
    path: 'auth',
    loadChildren: () => import('./features/auth/auth.routes').then(m => m.authRoutes)
  },
  {
    path: 'room',
    loadChildren: () => import('./features/room/room.routes').then(m => m.roomRoutes)
  },
  {
    path: 'pomodoro',
    loadChildren: () => import('./features/pomodoro/pomodoro.routes').then(m => m.pomodoroRoutes)
  },
  {
    path: 'leaderboard',
    loadChildren: () => import('./features/leaderboard/leaderboard.routes').then(m => m.leaderboardRoutes)
  },
  {
    path: 'chat',
    loadChildren: () => import('./features/chat/chat.routes').then(m => m.chatRoutes)
  },
  {
    path: 'video',
    loadChildren: () => import('./features/video-conference/video-conference.routes').then(m => m.videoConferenceRoutes)
  },
  { path: '', redirectTo: '/landing', pathMatch: 'full' },
  { path: '**', redirectTo: '/landing' }
];
