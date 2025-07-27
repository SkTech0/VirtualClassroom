import { Routes } from '@angular/router';
import { RoomListComponent } from './room-list.component';
import { RoomComponent } from './room.component';
import { authGuard } from '../../core/guards/auth.guard';

export const roomRoutes: Routes = [
  { path: '', component: RoomListComponent, canActivate: [authGuard] },
  { path: ':code', component: RoomComponent, canActivate: [authGuard] }
]; 