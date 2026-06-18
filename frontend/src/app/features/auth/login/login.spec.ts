import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { of, throwError } from 'rxjs';
import { LoginComponent } from './login';
import { AuthService } from '../../../core/auth/auth-service';

describe('LoginComponent', () => {
  let fixture: ComponentFixture<LoginComponent>;
  let comp: LoginComponent;
  let authSpy: jasmine.SpyObj<AuthService>;
  let router: Router;

  beforeEach(async () => {
    authSpy = jasmine.createSpyObj('AuthService', ['login']);
    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        provideRouter([{ path: 'tasks', component: LoginComponent }]),
        provideAnimationsAsync(),
        { provide: AuthService, useValue: authSpy }
      ]
    }).compileComponents();
    router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.returnValue(Promise.resolve(true));
    fixture = TestBed.createComponent(LoginComponent);
    comp = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => expect(comp).toBeTruthy());
  it('form invalid with empty fields', () => expect(comp.form.invalid).toBeTrue());
  it('form valid with email and password', () => {
    comp.form.setValue({ usernameOrEmail: 'a@b.com', password: 'pass' });
    expect(comp.form.valid).toBeTrue();
  });
  it('does not call login when form invalid', () => {
    comp.submit();
    expect(authSpy.login).not.toHaveBeenCalled();
  });
  it('calls login and navigates on success', fakeAsync(() => {
    authSpy.login.and.returnValue(of({ token: 't', expiresAtUtc: '', user: { id: '1', username: 'a', email: 'a@b.com', createdAt: '' } }));
    comp.form.setValue({ usernameOrEmail: 'a@b.com', password: 'pass' });
    comp.submit();
    tick();
    expect(authSpy.login).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/tasks']);
  }));
  it('sets error on failed login', fakeAsync(() => {
    authSpy.login.and.returnValue(throwError(() => ({ error: { message: 'Bad creds' } })));
    comp.form.setValue({ usernameOrEmail: 'a@b.com', password: 'wrong' });
    comp.submit();
    tick();
    expect(comp.error()).toBe('Bad creds');
    expect(comp.loading()).toBeFalse();
  }));
  it('sets generic error when no message', fakeAsync(() => {
    authSpy.login.and.returnValue(throwError(() => ({})));
    comp.form.setValue({ usernameOrEmail: 'a@b.com', password: 'wrong' });
    comp.submit();
    tick();
    expect(comp.error()).toBe('Login failed');
  }));
  it('renders login form', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('form')).toBeTruthy();
  });
});
