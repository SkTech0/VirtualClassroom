import { Component } from '@angular/core';
import { DecimalPipe, CommonModule } from '@angular/common';

@Component({
  selector: 'app-pomodoro',
  standalone: true,
  imports: [CommonModule, DecimalPipe],
  templateUrl: './pomodoro.component.html',
  styleUrls: ['./pomodoro.component.css'],
})
export class PomodoroComponent {
  workDuration = 25 * 60; // 25 minutes
  breakDuration = 5 * 60; // 5 minutes
  timeLeft = this.workDuration;
  running = false;
  isBreak = false;
  interval: any;

  get minutes() {
    return Math.floor(this.timeLeft / 60);
  }
  get seconds() {
    return this.timeLeft % 60;
  }

  toggle() {
    this.running = !this.running;
    if (this.running) {
      this.interval = setInterval(() => {
        if (this.timeLeft > 0) {
          this.timeLeft--;
        } else {
          this.isBreak = !this.isBreak;
          this.timeLeft = this.isBreak ? this.breakDuration : this.workDuration;
        }
      }, 1000);
    } else {
      clearInterval(this.interval);
    }
  }

  reset() {
    clearInterval(this.interval);
    this.running = false;
    this.isBreak = false;
    this.timeLeft = this.workDuration;
  }
} 