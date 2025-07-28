import { Routes } from '@angular/router';
import { VideoConferenceComponent } from './video-conference.component';

export const videoConferenceRoutes: Routes = [
  {
    path: ':code',
    component: VideoConferenceComponent
  }
]; 