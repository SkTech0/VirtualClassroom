import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly BASE_URL = environment.apiUrl;

  constructor(private http: HttpClient) {}

  get<T>(endpoint: string, options?: object): Observable<T> {
    return this.http.get<T>(`${this.BASE_URL}/${endpoint}`, options).pipe(
      catchError(this.handleError)
    );
  }

  post<T>(endpoint: string, body: any, options?: object): Observable<T> {
    return this.http.post<T>(`${this.BASE_URL}/${endpoint}`, body, options).pipe(
      catchError(this.handleError)
    );
  }

  put<T>(endpoint: string, body: any, options?: object): Observable<T> {
    return this.http.put<T>(`${this.BASE_URL}/${endpoint}`, body, options).pipe(
      catchError(this.handleError)
    );
  }

  delete<T>(endpoint: string, options?: object): Observable<T> {
    return this.http.delete<T>(`${this.BASE_URL}/${endpoint}`, options).pipe(
      catchError(this.handleError)
    );
  }

  private handleError(error: HttpErrorResponse) {
    return throwError(() => error);
  }

  /**
   * Extract user-facing message from API error response.
   * Supports structured responses: message, detail, error, and validation errors.
   */
  static getApiErrorMessage(err: HttpErrorResponse, fallback = 'An error occurred'): string {
    const body = err?.error;
    if (!body || typeof body !== 'object') return fallback;
    if (typeof body.message === 'string' && body.message.trim()) return body.message;
    if (typeof body.detail === 'string' && body.detail.trim()) return body.detail;
    if (typeof body.error === 'string' && body.error.trim()) return body.error;
    if (Array.isArray(body.errors) && body.errors.length > 0) {
      const first = body.errors[0];
      const msg = first?.errorMessage ?? first?.ErrorMessage ?? first?.message;
      if (typeof msg === 'string') return msg;
    }
    return fallback;
  }
} 