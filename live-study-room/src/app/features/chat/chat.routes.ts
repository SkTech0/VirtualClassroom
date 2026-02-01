import { Routes } from '@angular/router';
import { ChatComponent } from './chat.component';
import { authGuard } from '../../core/guards/auth.guard';

export const chatRoutes: Routes = [
  { path: '', component: ChatComponent, canActivate: [authGuard] }
];
