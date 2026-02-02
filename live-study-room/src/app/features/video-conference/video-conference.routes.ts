import { Routes } from '@angular/router';
import { VideoConferenceComponent } from './video-conference.component';
import { authGuard } from '../../core/guards/auth.guard';

export const videoConferenceRoutes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: '/room' },
  {
    path: ':code',
    component: VideoConferenceComponent,
    canActivate: [authGuard]
  }
]; 