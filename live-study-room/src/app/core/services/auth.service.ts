import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
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

  refreshToken(): Observable<AuthResponse> {
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) throw new Error('No refresh token');
    return this.http.post<AuthResponse>(`${this.BASE_URL}/refresh`, { refreshToken }).pipe(
      tap(res => this.setSession(res))
    );
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
    if (!res || !res.accessToken || !res.username || !res.email) {
      console.error('Invalid response data. Cannot set session.');
      return;
    }

    localStorage.setItem('token', res.accessToken);
    localStorage.setItem('refreshToken', res.refreshToken || '');
    const user = { username: res.username, email: res.email, role: res.role || 'Student' };
    try {
      localStorage.setItem('user', JSON.stringify(user));
    } catch (error) {
      console.error('Error saving user data to localStorage:', error);
    }
    this.currentUserSubject.next(user);
  }

  public getUserFromStorage(): { username: string; email: string; role?: string } | null {
    const userData = localStorage.getItem('user');
    if (!userData) {
      console.warn('No user data found in localStorage');
      return null;
    }

    try {
      return JSON.parse(userData);
    } catch (error) {
      console.error('Error parsing user data from localStorage:', error);
      localStorage.removeItem('user');
      return null;
    }
  }
}
