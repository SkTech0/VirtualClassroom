import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  if (authService.getToken()) {
    return true;
  }
  const returnUrl = state.url && state.url !== '/' ? state.url : '/room';
  router.navigate(['/auth/login'], { queryParams: { returnUrl } });
  return false;
}; 