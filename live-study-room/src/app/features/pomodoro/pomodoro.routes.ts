import { Routes } from '@angular/router';
import { PomodoroComponent } from './pomodoro.component';
import { authGuard } from '../../core/guards/auth.guard';

export const pomodoroRoutes: Routes = [
  { path: '', component: PomodoroComponent, canActivate: [authGuard] }
]; 