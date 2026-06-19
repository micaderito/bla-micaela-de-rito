import { Component, inject } from '@angular/core';
import { RouterOutlet, RouterLink } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { AuthService } from './core/auth/auth-service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, MatToolbarModule, MatButtonModule],
  template: `
    <mat-toolbar color="primary">
      <span>Task Manager</span>
      <span class="spacer"></span>
      @if (auth.isAuthenticated()) {
        <a mat-button routerLink="/tasks">Tasks</a>
        <a mat-button routerLink="/dashboard">Dashboard</a>
        <span class="username">{{ auth.user()?.username }}</span>
        <button mat-button (click)="auth.logout()">Logout</button>
      } @else {
        <a mat-button routerLink="/login">Login</a>
        <a mat-button routerLink="/register">Register</a>
      }
    </mat-toolbar>
    <main>
      <router-outlet />
    </main>
  `,
  styles: [`
    mat-toolbar { position: sticky; top: 0; z-index: 100; }
    .spacer { flex: 1; }
    .username { margin-right: 8px; font-size: 14px; }
    main { padding: 24px 16px; max-width: 960px; margin: 0 auto; }
  `]
})
export class App {
  auth = inject(AuthService);
}
