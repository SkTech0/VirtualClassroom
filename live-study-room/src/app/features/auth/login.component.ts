import { Component } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDividerModule } from '@angular/material/divider';
import { ApiService } from '../../core/services/api.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatDividerModule,
    RouterModule
  ],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  form;
  loading = false;
  error = '';

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private snackBar: MatSnackBar
  ) {
    this.form = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  onSubmit() {
    if (this.form.invalid) return;
    
    this.loading = true;
    this.error = '';
    
    const { email, password } = this.form.value;
    
    if (!email || !password) {
      this.loading = false;
      this.error = 'Please provide both email and password.';
      return;
    }
    
    this.auth.login(email, password).subscribe({
      next: () => {
        this.loading = false;
        this.snackBar.open('Welcome back!', 'Close', { duration: 2000 });
        const returnUrl = this.route.snapshot.queryParams['returnUrl'];
        const path = (returnUrl && !returnUrl.startsWith('http')) ? returnUrl : '/room';
        // Defer navigation so token is committed to storage before protected routes load
        setTimeout(() => this.router.navigateByUrl(path), 0);
      },
      error: err => {
        this.loading = false;
        this.error = ApiService.getApiErrorMessage(err, 'Login failed. Please check your credentials.');
      },
      complete: () => {
        this.loading = false;
      }
    });
  }
} 