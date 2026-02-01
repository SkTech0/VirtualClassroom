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
    // Customize error handling as needed
    return throwError(() => error);
  }
} 