import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';

export interface AuthResponse {
  token: string;
  role: any;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly BASE_URL = 'http://localhost:5275/api/auth'; // Update as needed
  private currentUserSubject = new BehaviorSubject<any | null>(this.getUserFromStorage());
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
    if (!res || !res.token || !res.role) {
      console.error('Invalid response data. Cannot set session.');
      return;
    }

    localStorage.setItem('token', res.token);
    try {
      localStorage.setItem('user', JSON.stringify(res.role));
    } catch (error) {
      console.error('Error saving user data to localStorage:', error);
    }
    this.currentUserSubject.next(res.role);
  }

  public getUserFromStorage(): any {
    const userData = localStorage.getItem('user'); // Retrieve data from localStorage
    if (!userData) {
      console.warn('No user data found in localStorage');
      return null; // Return null if no data is found
    }

    try {
      return JSON.parse(userData); // Parse the JSON string
    } catch (error) {
      console.error('Error parsing user data from localStorage:', error);
      localStorage.removeItem('user'); // Remove invalid data to prevent repeated errors
      return null; // Return null if parsing fails
    }
  }
}