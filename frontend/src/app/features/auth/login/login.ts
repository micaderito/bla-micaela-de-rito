import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../../core/auth/auth-service';
import { ROUTES } from '../../../core/constants/app.constants';
import { AUTH_MESSAGES } from '../../../core/messages/app.messages';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, MatCardModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  readonly auth = inject(AuthService);
  private router = inject(Router);

  form = this.fb.group({
    usernameOrEmail: ['', Validators.required],
    password: ['', Validators.required]
  });

  error = signal<string | null>(null);
  loading = signal(false);

  submit() {
    if (this.form.invalid) return;
    this.loading.set(true);
    this.error.set(null);
    const { usernameOrEmail, password } = this.form.value;
    this.auth.login({ usernameOrEmail: usernameOrEmail!, password: password! }).subscribe({
      next: () => this.router.navigate([ROUTES.TASKS]),
      error: (err: { error?: { message?: string } }) => {
        this.error.set(err.error?.message ?? AUTH_MESSAGES.LOGIN_FAILED);
        this.loading.set(false);
      }
    });
  }
}
