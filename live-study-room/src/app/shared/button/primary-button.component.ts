import { Component, Input } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-primary-button',
  standalone: true,
  imports: [MatButtonModule, MatProgressSpinnerModule, CommonModule],
  template: `
    <button mat-raised-button color="primary" [disabled]="loading || disabled">
      <mat-progress-spinner *ngIf="loading" diameter="20" mode="indeterminate"></mat-progress-spinner>
      <ng-content *ngIf="!loading"></ng-content>
    </button>
  `,
  styles: [':host { display: inline-block; }']
})
export class PrimaryButtonComponent {
  @Input() loading = false;
  @Input() disabled = false;
} 