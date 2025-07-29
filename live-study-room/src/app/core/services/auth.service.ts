import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';

export interface AuthResponse {
  token: string;
  username: string;
  email: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly BASE_URL = 'http://localhost:5275/api/auth'; // Update as needed
  private currentUserSubject = new BehaviorSubject<{ username: string; email: string } | null>(this.getUserFromStorage());
  currentUser$ = this.currentUserSubject.asObservable();

  constructor(private http: HttpClient) {}

  login(email: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.BASE_URL}/login`, { email, password }).pipe(
      tap(res => this.setSession(res))
    );
  }

  register(data: any): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.BASE_URL}/register`, data).pipe(
      tap(res => this.setSession(res))
    );
  }

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    this.currentUserSubject.next(null);
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }

  private setSession(res: AuthResponse) {
    if (!res || !res.token || !res.username || !res.email) {
      console.error('Invalid response data. Cannot set session.');
      return;
    }

    localStorage.setItem('token', res.token);
    const user = {
      username: res.username,
      email: res.email
    };

    try {
      localStorage.setItem('user', JSON.stringify(user));
    } catch (error) {
      console.error('Error saving user data to localStorage:', error);
    }

    this.currentUserSubject.next(user);
  }

  public getUserFromStorage(): { username: string; email: string } | null {
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
