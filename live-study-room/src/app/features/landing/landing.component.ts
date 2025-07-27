import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatCardModule, MatIconModule],
  template: `
    <div class="landing-container">
      <!-- Hero Section -->
      <section class="hero-section">
        <div class="hero-content">
          <div class="hero-text">
            <h1 class="hero-title">
              <span class="gradient-text">Study Together</span>
              <br>Learn Together
            </h1>
            <p class="hero-subtitle">
              Join virtual study rooms, collaborate with peers, and boost your productivity 
              with our integrated Pomodoro timer and real-time chat.
            </p>
            <div class="hero-buttons">
              <button 
                mat-raised-button 
                color="primary" 
                class="cta-button"
                (click)="navigateToAuth()"
              >
                <mat-icon>rocket_launch</mat-icon>
                Get Started
              </button>
              <button 
                mat-stroked-button 
                class="demo-button"
                (click)="showDemo()"
              >
                <mat-icon>play_circle</mat-icon>
                Watch Demo
              </button>
            </div>
          </div>
          <div class="hero-visual">
            <div class="floating-cards">
              <div class="card card-1">
                <div class="card-content">
                  <mat-icon>group</mat-icon>
                  <span>Study Groups</span>
                </div>
              </div>
              <div class="card card-2">
                <div class="card-content">
                  <mat-icon>timer</mat-icon>
                  <span>Pomodoro Timer</span>
                </div>
              </div>
              <div class="card card-3">
                <div class="card-content">
                  <mat-icon>chat</mat-icon>
                  <span>Real-time Chat</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Features Section -->
      <section class="features-section">
        <div class="container">
          <h2 class="section-title">Why Choose Our Platform?</h2>
          <div class="features-grid">
            <div class="feature-card">
              <div class="feature-icon">
                <mat-icon>groups</mat-icon>
              </div>
              <h3>Virtual Study Rooms</h3>
              <p>Create or join study rooms with unique codes. Collaborate with peers in real-time.</p>
            </div>
            <div class="feature-card">
              <div class="feature-icon">
                <mat-icon>schedule</mat-icon>
              </div>
              <h3>Pomodoro Timer</h3>
              <p>Stay focused with our integrated Pomodoro technique timer. Track your study sessions.</p>
            </div>
            <div class="feature-card">
              <div class="feature-icon">
                <mat-icon>chat_bubble</mat-icon>
              </div>
              <h3>Real-time Chat</h3>
              <p>Communicate with your study group through our instant messaging system.</p>
            </div>
            <div class="feature-card">
              <div class="feature-icon">
                <mat-icon>leaderboard</mat-icon>
              </div>
              <h3>Leaderboard</h3>
              <p>Compete with friends and track your study progress on our leaderboard.</p>
            </div>
          </div>
        </div>
      </section>

      <!-- How It Works Section -->
      <section class="how-it-works-section">
        <div class="container">
          <h2 class="section-title">How It Works</h2>
          <div class="steps-container">
            <div class="step">
              <div class="step-number">1</div>
              <div class="step-content">
                <h3>Sign Up</h3>
                <p>Create your account in seconds with just your email and password.</p>
              </div>
            </div>
            <div class="step">
              <div class="step-number">2</div>
              <div class="step-content">
                <h3>Create or Join</h3>
                <p>Create a new study room or join an existing one using a room code.</p>
              </div>
            </div>
            <div class="step">
              <div class="step-number">3</div>
              <div class="step-content">
                <h3>Study Together</h3>
                <p>Use the Pomodoro timer, chat with peers, and track your progress.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- CTA Section -->
      <section class="cta-section">
        <div class="container">
          <div class="cta-content">
            <h2>Ready to Boost Your Study Sessions?</h2>
            <p>Join thousands of students who are already studying smarter together.</p>
            <button 
              mat-raised-button 
              color="primary" 
              class="cta-button-large"
              (click)="navigateToAuth()"
            >
              <mat-icon>school</mat-icon>
              Start Studying Now
            </button>
          </div>
        </div>
      </section>

      <!-- Footer -->
      <footer class="footer">
        <div class="container">
          <div class="footer-content">
            <div class="footer-section">
              <h3>Live Study Room</h3>
              <p>Empowering students to study together, anywhere, anytime.</p>
            </div>
            <div class="footer-section">
              <h4>Features</h4>
              <ul>
                <li>Virtual Study Rooms</li>
                <li>Pomodoro Timer</li>
                <li>Real-time Chat</li>
                <li>Leaderboard</li>
              </ul>
            </div>
            <div class="footer-section">
              <h4>Support</h4>
              <ul>
                <li>Help Center</li>
                <li>Contact Us</li>
                <li>Privacy Policy</li>
                <li>Terms of Service</li>
              </ul>
            </div>
          </div>
          <div class="footer-bottom">
            <p>&copy; 2024 Live Study Room. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  `,
  styles: [`
    .landing-container {
      min-height: 100vh;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    }

    /* Hero Section */
    .hero-section {
      padding: 4rem 2rem;
      min-height: 100vh;
      display: flex;
      align-items: center;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      position: relative;
      overflow: hidden;
    }

    .hero-section::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><pattern id="grain" width="100" height="100" patternUnits="userSpaceOnUse"><circle cx="25" cy="25" r="1" fill="white" opacity="0.1"/><circle cx="75" cy="75" r="1" fill="white" opacity="0.1"/><circle cx="50" cy="10" r="0.5" fill="white" opacity="0.1"/><circle cx="10" cy="60" r="0.5" fill="white" opacity="0.1"/><circle cx="90" cy="40" r="0.5" fill="white" opacity="0.1"/></pattern></defs><rect width="100" height="100" fill="url(%23grain)"/></svg>');
      opacity: 0.3;
    }

    .hero-content {
      max-width: 1200px;
      margin: 0 auto;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 4rem;
      align-items: center;
      position: relative;
      z-index: 1;
    }

    .hero-title {
      font-size: 3.5rem;
      font-weight: 700;
      color: white;
      margin-bottom: 1.5rem;
      line-height: 1.2;
    }

    .gradient-text {
      background: linear-gradient(45deg, #ffd700, #ffed4e);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .hero-subtitle {
      font-size: 1.25rem;
      color: rgba(255, 255, 255, 0.9);
      margin-bottom: 2rem;
      line-height: 1.6;
    }

    .hero-buttons {
      display: flex;
      gap: 1rem;
      flex-wrap: wrap;
    }

    .cta-button {
      padding: 1rem 2rem;
      font-size: 1.1rem;
      font-weight: 600;
      border-radius: 50px;
      text-transform: none;
      box-shadow: 0 8px 25px rgba(0, 0, 0, 0.2);
      transition: all 0.3s ease;
    }

    .cta-button:hover {
      transform: translateY(-2px);
      box-shadow: 0 12px 35px rgba(0, 0, 0, 0.3);
    }

    .demo-button {
      padding: 1rem 2rem;
      font-size: 1.1rem;
      font-weight: 600;
      border-radius: 50px;
      text-transform: none;
      color: white;
      border-color: rgba(255, 255, 255, 0.3);
      transition: all 0.3s ease;
    }

    .demo-button:hover {
      background: rgba(255, 255, 255, 0.1);
      border-color: rgba(255, 255, 255, 0.5);
    }

    /* Floating Cards */
    .floating-cards {
      position: relative;
      height: 400px;
    }

    .card {
      position: absolute;
      background: rgba(255, 255, 255, 0.1);
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 20px;
      padding: 1.5rem;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
      transition: all 0.3s ease;
    }

    .card:hover {
      transform: scale(1.05);
      background: rgba(255, 255, 255, 0.15);
    }

    .card-1 {
      top: 20%;
      left: 10%;
      animation: float 6s ease-in-out infinite;
    }

    .card-2 {
      top: 50%;
      right: 20%;
      animation: float 6s ease-in-out infinite 2s;
    }

    .card-3 {
      bottom: 20%;
      left: 30%;
      animation: float 6s ease-in-out infinite 4s;
    }

    .card-content {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.5rem;
      color: white;
    }

    .card-content mat-icon {
      font-size: 2rem;
      width: 2rem;
      height: 2rem;
    }

    @keyframes float {
      0%, 100% { transform: translateY(0px); }
      50% { transform: translateY(-20px); }
    }

    /* Features Section */
    .features-section {
      padding: 6rem 2rem;
      background: white;
    }

    .container {
      max-width: 1200px;
      margin: 0 auto;
    }

    .section-title {
      text-align: center;
      font-size: 2.5rem;
      font-weight: 700;
      color: #333;
      margin-bottom: 3rem;
    }

    .features-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 2rem;
    }

    .feature-card {
      text-align: center;
      padding: 2rem;
      border-radius: 20px;
      background: #f8f9fa;
      transition: all 0.3s ease;
      border: 1px solid #e9ecef;
    }

    .feature-card:hover {
      transform: translateY(-5px);
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
      background: white;
    }

    .feature-icon {
      width: 80px;
      height: 80px;
      margin: 0 auto 1.5rem;
      background: linear-gradient(135deg, #667eea, #764ba2);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .feature-icon mat-icon {
      font-size: 2rem;
      width: 2rem;
      height: 2rem;
      color: white;
    }

    .feature-card h3 {
      font-size: 1.5rem;
      font-weight: 600;
      color: #333;
      margin-bottom: 1rem;
    }

    .feature-card p {
      color: #666;
      line-height: 1.6;
    }

    /* How It Works Section */
    .how-it-works-section {
      padding: 6rem 2rem;
      background: #f8f9fa;
    }

    .steps-container {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 3rem;
      margin-top: 3rem;
    }

    .step {
      display: flex;
      align-items: flex-start;
      gap: 1.5rem;
    }

    .step-number {
      width: 60px;
      height: 60px;
      background: linear-gradient(135deg, #667eea, #764ba2);
      color: white;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.5rem;
      font-weight: 700;
      flex-shrink: 0;
    }

    .step-content h3 {
      font-size: 1.5rem;
      font-weight: 600;
      color: #333;
      margin-bottom: 0.5rem;
    }

    .step-content p {
      color: #666;
      line-height: 1.6;
    }

    /* CTA Section */
    .cta-section {
      padding: 6rem 2rem;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      text-align: center;
    }

    .cta-content h2 {
      font-size: 2.5rem;
      font-weight: 700;
      color: white;
      margin-bottom: 1rem;
    }

    .cta-content p {
      font-size: 1.25rem;
      color: rgba(255, 255, 255, 0.9);
      margin-bottom: 2rem;
    }

    .cta-button-large {
      padding: 1.25rem 3rem;
      font-size: 1.25rem;
      font-weight: 600;
      border-radius: 50px;
      text-transform: none;
      box-shadow: 0 8px 25px rgba(0, 0, 0, 0.2);
      transition: all 0.3s ease;
    }

    .cta-button-large:hover {
      transform: translateY(-2px);
      box-shadow: 0 12px 35px rgba(0, 0, 0, 0.3);
    }

    /* Footer */
    .footer {
      background: #333;
      color: white;
      padding: 3rem 2rem 1rem;
    }

    .footer-content {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 2rem;
      margin-bottom: 2rem;
    }

    .footer-section h3,
    .footer-section h4 {
      margin-bottom: 1rem;
      color: #fff;
    }

    .footer-section p {
      color: #ccc;
      line-height: 1.6;
    }

    .footer-section ul {
      list-style: none;
      padding: 0;
    }

    .footer-section ul li {
      color: #ccc;
      margin-bottom: 0.5rem;
      cursor: pointer;
      transition: color 0.3s ease;
    }

    .footer-section ul li:hover {
      color: #667eea;
    }

    .footer-bottom {
      border-top: 1px solid #555;
      padding-top: 1rem;
      text-align: center;
    }

    .footer-bottom p {
      color: #ccc;
      margin: 0;
    }

    /* Responsive Design */
    @media (max-width: 768px) {
      .hero-content {
        grid-template-columns: 1fr;
        text-align: center;
        gap: 2rem;
      }

      .hero-title {
        font-size: 2.5rem;
      }

      .hero-buttons {
        justify-content: center;
      }

      .floating-cards {
        height: 300px;
      }

      .card {
        position: relative;
        margin: 1rem auto;
        max-width: 250px;
      }

      .card-1, .card-2, .card-3 {
        position: static;
        animation: none;
      }

      .section-title {
        font-size: 2rem;
      }

      .steps-container {
        grid-template-columns: 1fr;
      }

      .cta-content h2 {
        font-size: 2rem;
      }
    }

    @media (max-width: 480px) {
      .hero-section {
        padding: 2rem 1rem;
      }

      .hero-title {
        font-size: 2rem;
      }

      .hero-subtitle {
        font-size: 1rem;
      }

      .cta-button,
      .demo-button {
        padding: 0.75rem 1.5rem;
        font-size: 1rem;
      }

      .features-section,
      .how-it-works-section,
      .cta-section {
        padding: 3rem 1rem;
      }
    }
  `]
})
export class LandingComponent implements OnInit {

  constructor(
    private router: Router,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    // Add any initialization logic here
  }

  navigateToAuth(): void {
    this.router.navigate(['/auth/login']);
  }

  showDemo(): void {
    this.snackBar.open('Demo video coming soon!', 'Close', { duration: 3000 });
  }
} 