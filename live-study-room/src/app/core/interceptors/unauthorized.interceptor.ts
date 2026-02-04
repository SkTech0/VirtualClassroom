import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError, switchMap } from 'rxjs';
import { AuthService } from '../services/auth.service';

function isAuthEndpoint(url: string): boolean {
  return url.includes('/auth/login') || url.includes('/auth/register');
}

function isRefreshEndpoint(url: string): boolean {
  return url.includes('/auth/refresh');
}

/**
 * Map failed API request URL to the app path the user was trying to reach,
 * so after login we redirect to the right page (e.g. /room or /room/ABC123).
 */
function apiUrlToAppReturnUrl(apiUrl: string): string {
  if (!apiUrl) return '/room';
  try {
    const path = new URL(apiUrl).pathname;
    // Match /api/v1/rooms, /api/v1/rooms/mine, /api/v1/rooms/ABC123, /api/v1/rooms/ABC/participants
    const roomsMatch = path.match(/\/api\/v\d+\/rooms(?:\/([^/]+))?(?:\/|$)/);
    if (roomsMatch) {
      const code = roomsMatch[1];
      if (!code || code === 'mine' || code === 'create' || code === 'join' || code === 'leave') return '/room';
      return `/room/${encodeURIComponent(code)}`;
    }
    if (path.includes('/auth/me') || path.includes('/pomodoro') || path.includes('/video')) return '/room';
    return '/room';
  } catch {
    return '/room';
  }
}

export const unauthorizedInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const authService = inject(AuthService);

  return next(req).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err?.status !== 401) return throwError(() => err);
      const url = err?.url ?? req.url ?? '';
      if (isAuthEndpoint(url)) return throwError(() => err);
      if (isRefreshEndpoint(url)) {
        authService.logout();
        const returnUrl = apiUrlToAppReturnUrl(req.url);
        router.navigate(['/auth/login'], { queryParams: { returnUrl } });
        return throwError(() => err);
      }
      try {
        return authService.refreshToken().pipe(
          switchMap(() => next(req)),
          catchError(() => {
            authService.logout();
            const returnUrl = apiUrlToAppReturnUrl(req.url);
            router.navigate(['/auth/login'], { queryParams: { returnUrl } });
            return throwError(() => err);
          })
        );
      } catch {
        authService.logout();
        const returnUrl = apiUrlToAppReturnUrl(req.url);
        router.navigate(['/auth/login'], { queryParams: { returnUrl } });
        return throwError(() => err);
      }
    })
  );
};
