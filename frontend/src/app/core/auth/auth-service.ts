import { Injectable, signal, computed } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap } from 'rxjs/operators';
import { AuthResult, LoginDto, RegisterDto, User } from '../models';
import { API_BASE, AUTH_TOKEN_KEY, ROUTES } from '../constants/app.constants';

@Injectable({ providedIn: 'root' })
export class AuthService {
  readonly apiBase = API_BASE.AUTH;

  private _token = signal<string | null>(localStorage.getItem(AUTH_TOKEN_KEY));
  private _user = signal<User | null>(null);

  readonly token = this._token.asReadonly();
  readonly user = this._user.asReadonly();
  readonly isAuthenticated = computed(() => !!this._token());

  constructor(private http: HttpClient, private router: Router) {
    if (this._token()) {
      this.loadCurrentUser();
    }
  }

  register(dto: RegisterDto) {
    return this.http.post<AuthResult>(`${this.apiBase}/register`, dto).pipe(
      tap(result => this.setSession(result))
    );
  }

  login(dto: LoginDto) {
    return this.http.post<AuthResult>(`${this.apiBase}/login`, dto).pipe(
      tap(result => this.setSession(result))
    );
  }

  logout() {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    this._token.set(null);
    this._user.set(null);
    this.router.navigate([ROUTES.LOGIN]);
  }

  setSession(result: AuthResult) {
    localStorage.setItem(AUTH_TOKEN_KEY, result.token);
    this._token.set(result.token);
    this._user.set(result.user);
  }

  loadCurrentUser() {
    this.http.get<User>(`${this.apiBase}/me`).subscribe({
      next: user => this._user.set(user),
      error: (err: HttpErrorResponse) => {
        if (err.status === 401) this.logout();
      }
    });
  }
}
