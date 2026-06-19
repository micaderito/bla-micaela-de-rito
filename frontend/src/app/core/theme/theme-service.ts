import { Injectable, signal, effect } from '@angular/core';

export type ThemeMode = 'light' | 'dark';

const STORAGE_KEY = 'theme';

/**
 * Manages the light/dark theme. Initial mode follows the OS setting unless the
 * user has explicitly chosen one (persisted in localStorage). While the user
 * has not made an explicit choice, the theme keeps tracking the OS preference.
 */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly theme = signal<ThemeMode>(this.readInitial());

  constructor() {
    effect(() => {
      document.documentElement.setAttribute('data-theme', this.theme());
    });

    window
      .matchMedia('(prefers-color-scheme: dark)')
      .addEventListener('change', (e) => {
        if (!localStorage.getItem(STORAGE_KEY)) {
          this.theme.set(e.matches ? 'dark' : 'light');
        }
      });
  }

  toggle(): void {
    const next: ThemeMode = this.theme() === 'dark' ? 'light' : 'dark';
    this.theme.set(next);
    localStorage.setItem(STORAGE_KEY, next);
  }

  private readInitial(): ThemeMode {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark') {
      return stored;
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
  }
}
