import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap, shareReplay } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  expiresAt: string;
  username: string;
  email: string;
  role: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly BASE_URL = `${environment.apiUrl}/auth`;
  private currentUserSubject = new BehaviorSubject<{ username: string; email: string; role?: string } | null>(this.getUserFromStorage());
  currentUser$ = this.currentUserSubject.asObservable();

  constructor(private http: HttpClient) {}

  login(email: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.BASE_URL}/login`, { email, password }).pipe(
      tap(res => this.setSession(res))
    );
  }

  register(data: { email: string; username: string; password: string }): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.BASE_URL}/register`, data).pipe(
      tap(res => this.setSession(res))
    );
  }

  /** Shared refresh in progress so concurrent 401s trigger only one refresh call. */
  private refreshInProgress: Observable<AuthResponse> | null = null;

  refreshToken(): Observable<AuthResponse> {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) throw new Error('No refresh token');
    if (!this.refreshInProgress) {
      this.refreshInProgress = this.http.post<AuthResponse>(`${this.BASE_URL}/refresh`, { refreshToken }).pipe(
        tap(res => this.setSession(res)),
        tap({ next: () => { this.refreshInProgress = null; }, error: () => { this.refreshInProgress = null; } }),
        shareReplay({ bufferSize: 1, refCount: false })
      );
    }
    return this.refreshInProgress;
  }

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    this.currentUserSubject.next(null);
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }

  private setSession(res: AuthResponse) {
    const raw = res as unknown as Record<string, unknown>;
    const accessToken = (res?.accessToken ?? raw?.['AccessToken']) as string | undefined;
    const username = (res?.username ?? raw?.['Username']) as string | undefined;
    const email = (res?.email ?? raw?.['Email']) as string | undefined;
    const refreshToken = (res?.refreshToken ?? raw?.['RefreshToken']) as string | undefined;
    const role = (res?.role ?? raw?.['Role']) as string | undefined;

    if (!res || !accessToken || !username || !email) {
      console.error('Invalid response data. Cannot set session.');
      return;
    }

    localStorage.setItem('token', accessToken);
    localStorage.setItem('refreshToken', refreshToken ?? '');
    const user = { username, email, role: (role as string) || 'Student' };
    try {
      localStorage.setItem('user', JSON.stringify(user));
    } catch (error) {
      console.error('Error saving user data to localStorage:', error);
    }
    this.currentUserSubject.next(user);
  }

  public getUserFromStorage(): { username: string; email: string; role?: string } | null {
    const userData = localStorage.getItem('user');
    if (userData) {
      try {
        return JSON.parse(userData);
      } catch (error) {
        console.error('Error parsing user data from localStorage:', error);
        localStorage.removeItem('user');
        return null;
      }
    }

    // Fallback: restore user from token claims when token exists but user key was never set (e.g. old session)
    const token = this.getToken();
    if (token) {
      const user = this.getUserFromToken(token);
      if (user) {
        try {
          localStorage.setItem('user', JSON.stringify(user));
        } catch {
          // ignore quota errors
        }
        return user;
      }
    }

    return null;
  }

  /** Decode user from JWT claims (sub, email, unique_name, role). */
  private getUserFromToken(token: string): { username: string; email: string; role?: string } | null {
    try {
      const payload = JSON.parse(atob(token.split('.')[1])) as Record<string, unknown>;
      const email = (payload['email'] ?? payload['Email']) as string | undefined;
      const username = (payload['unique_name'] ?? payload['Username'] ?? payload['sub']) as string | undefined;
      const role = (payload['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] ?? payload['role']) as string | undefined;
      if (email && username) {
        return { username, email, role: role ?? 'Student' };
      }
    } catch {
      // invalid token
    }
    return null;
  }
}
