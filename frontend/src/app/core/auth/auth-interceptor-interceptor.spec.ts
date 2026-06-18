import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { authInterceptorInterceptor } from './auth-interceptor-interceptor';
import { AuthService } from './auth-service';

describe('authInterceptorInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptorInterceptor])),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: { token: () => 'my-token' } }
      ]
    });
    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('should attach Authorization header when token present', fakeAsync(() => {
    http.get('/test').subscribe();
    const req = httpMock.expectOne('/test');
    expect(req.request.headers.get('Authorization')).toBe('Bearer my-token');
    req.flush({});
  }));
});

describe('authInterceptorInterceptor - no token', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptorInterceptor])),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: { token: () => null } }
      ]
    });
    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('should not attach Authorization header when no token', fakeAsync(() => {
    http.get('/test').subscribe();
    const req = httpMock.expectOne('/test');
    expect(req.request.headers.has('Authorization')).toBeFalse();
    req.flush({});
  }));
});
