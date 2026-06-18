import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { AuthService } from './auth-service';
import { AuthResult } from '../models';

const mockResult: AuthResult = {
  token: 'test-token', expiresAtUtc: '',
  user: { id: '1', username: 'alice', email: 'alice@test.com', createdAt: new Date().toISOString() }
};

describe('AuthService', () => {
  let service: AuthService;
  let http: HttpTestingController;
  let routerSpy: jasmine.SpyObj<Router>;

  beforeEach(() => {
    localStorage.clear();
    routerSpy = jasmine.createSpyObj('Router', ['navigate']);
    routerSpy.navigate.and.returnValue(Promise.resolve(true));
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: Router, useValue: routerSpy }
      ]
    });
    service = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => { http.verify(); localStorage.clear(); });

  it('should be created', () => expect(service).toBeTruthy());

  it('isAuthenticated false when no token', () => expect(service.isAuthenticated()).toBeFalse());

  it('login sets token and user', fakeAsync(() => {
    service.login({ usernameOrEmail: 'alice@test.com', password: 'pass' }).subscribe();
    http.expectOne(`${service.apiBase}/login`).flush(mockResult);
    tick();
    expect(service.isAuthenticated()).toBeTrue();
    expect(service.token()).toBe('test-token');
    expect(service.user()?.username).toBe('alice');
  }));

  it('register sets token and user', fakeAsync(() => {
    service.register({ username: 'alice', email: 'alice@test.com', password: 'pass1234' }).subscribe();
    http.expectOne(`${service.apiBase}/register`).flush(mockResult);
    tick();
    expect(service.isAuthenticated()).toBeTrue();
  }));

  it('logout clears state and navigates to /login', fakeAsync(() => {
    service.setSession(mockResult);
    service.logout();
    tick();
    expect(service.isAuthenticated()).toBeFalse();
    expect(service.token()).toBeNull();
    expect(service.user()).toBeNull();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/login']);
  }));

  it('loadCurrentUser sets user on success', fakeAsync(() => {
    service.setSession(mockResult);
    service.loadCurrentUser();
    http.expectOne(`${service.apiBase}/me`).flush(mockResult.user);
    tick();
    expect(service.user()?.username).toBe('alice');
  }));

  it('loadCurrentUser calls logout on error', fakeAsync(() => {
    service.setSession(mockResult);
    spyOn(service, 'logout');
    service.loadCurrentUser();
    http.expectOne(`${service.apiBase}/me`).flush('error', { status: 401, statusText: 'Unauthorized' });
    tick();
    expect(service.logout).toHaveBeenCalled();
  }));
});
