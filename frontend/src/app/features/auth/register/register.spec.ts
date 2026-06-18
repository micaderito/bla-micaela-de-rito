import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { of, throwError } from 'rxjs';
import { RegisterComponent } from './register';
import { AuthService } from '../../../core/auth/auth-service';

describe('RegisterComponent', () => {
  let fixture: ComponentFixture<RegisterComponent>;
  let comp: RegisterComponent;
  let authSpy: jasmine.SpyObj<AuthService>;
  let router: Router;

  beforeEach(async () => {
    authSpy = jasmine.createSpyObj('AuthService', ['register']);
    await TestBed.configureTestingModule({
      imports: [RegisterComponent],
      providers: [
        provideRouter([{ path: 'tasks', component: RegisterComponent }]),
        provideAnimationsAsync(),
        { provide: AuthService, useValue: authSpy }
      ]
    }).compileComponents();
    router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.returnValue(Promise.resolve(true));
    fixture = TestBed.createComponent(RegisterComponent);
    comp = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => expect(comp).toBeTruthy());
  it('form invalid when empty', () => expect(comp.form.invalid).toBeTrue());
  it('validates password min length', () => {
    comp.form.setValue({ username: 'alice', email: 'a@b.com', password: 'short' });
    expect(comp.form.get('password')?.hasError('minlength')).toBeTrue();
  });
  it('form valid with all fields', () => {
    comp.form.setValue({ username: 'alice', email: 'a@b.com', password: 'password123' });
    expect(comp.form.valid).toBeTrue();
  });
  it('does not register on invalid form', () => {
    comp.submit();
    expect(authSpy.register).not.toHaveBeenCalled();
  });
  it('calls register and navigates on success', fakeAsync(() => {
    authSpy.register.and.returnValue(of({ token: 't', expiresAtUtc: '', user: { id: '1', username: 'alice', email: 'a@b.com', createdAt: '' } }));
    comp.form.setValue({ username: 'alice', email: 'a@b.com', password: 'password123' });
    comp.submit();
    tick();
    expect(authSpy.register).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/tasks']);
  }));
  it('sets error on failed register', fakeAsync(() => {
    authSpy.register.and.returnValue(throwError(() => ({ error: { message: 'Duplicate email' } })));
    comp.form.setValue({ username: 'alice', email: 'dup@b.com', password: 'password123' });
    comp.submit();
    tick();
    expect(comp.error()).toBe('Duplicate email');
  }));
  it('sets generic error when no message', fakeAsync(() => {
    authSpy.register.and.returnValue(throwError(() => ({})));
    comp.form.setValue({ username: 'alice', email: 'dup@b.com', password: 'password123' });
    comp.submit();
    tick();
    expect(comp.error()).toBe('Registration failed');
  }));
});
