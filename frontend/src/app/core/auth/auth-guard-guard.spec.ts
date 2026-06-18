import { TestBed } from '@angular/core/testing';
import { UrlTree, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { authGuardGuard } from './auth-guard-guard';
import { AuthService } from './auth-service';

function runGuard() {
  return TestBed.runInInjectionContext(() =>
    authGuardGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot)
  );
}

describe('authGuardGuard - authenticated', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        { provide: Router, useValue: { createUrlTree: (cmds: string[]) => cmds as unknown as UrlTree } },
        { provide: AuthService, useValue: { isAuthenticated: () => true } }
      ]
    });
  });
  it('returns true when authenticated', () => expect(runGuard()).toBeTrue());
});

describe('authGuardGuard - unauthenticated', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        { provide: Router, useValue: { createUrlTree: (cmds: string[]) => cmds } },
        { provide: AuthService, useValue: { isAuthenticated: () => false } }
      ]
    });
  });
  it('redirects when not authenticated', () => {
    const result = runGuard();
    expect(result).toEqual(['/login'] as unknown as UrlTree);
  });
});
