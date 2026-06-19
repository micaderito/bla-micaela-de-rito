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
  selector: 'app-register',
  imports: [ReactiveFormsModule, MatCardModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule, RouterLink],
  templateUrl: './register.html',
  styleUrl: './register.scss',
})
export class RegisterComponent {
  private fb = inject(FormBuilder);
  readonly auth = inject(AuthService);
  private router = inject(Router);

  form = this.fb.group({
    username: ['', [Validators.required, Validators.minLength(3)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]]
  });

  error = signal<string | null>(null);
  loading = signal(false);

  submit() {
    if (this.form.invalid) return;
    this.loading.set(true);
    this.error.set(null);
    const { username, email, password } = this.form.value;
    this.auth.register({ username: username!, email: email!, password: password! }).subscribe({
      next: () => this.router.navigate([ROUTES.TASKS]),
      error: (err: { error?: { message?: string } }) => {
        this.error.set(err.error?.message ?? AUTH_MESSAGES.REGISTER_FAILED);
        this.loading.set(false);
      }
    });
  }
}
