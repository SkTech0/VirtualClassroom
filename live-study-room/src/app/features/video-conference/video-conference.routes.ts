import { Routes } from '@angular/router';
import { VideoConferenceComponent } from './video-conference.component';
import { authGuard } from '../../core/guards/auth.guard';

export const videoConferenceRoutes: Routes = [
  {
    path: ':code',
    component: VideoConferenceComponent,
    canActivate: [authGuard]
  }
]; 