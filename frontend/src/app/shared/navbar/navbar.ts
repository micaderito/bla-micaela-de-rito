import { Component, inject, computed } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { AuthService } from '../../core/auth/auth-service';

interface NavItem {
  path: string;
  label: string;
  icon: string;
}

@Component({
  selector: 'app-navbar',
  imports: [RouterLink, RouterLinkActive, MatButtonModule, MatIconModule, MatMenuModule],
  templateUrl: './navbar.html',
  styleUrl: './navbar.scss',
})
export class NavbarComponent {
  private router = inject(Router);
  auth = inject(AuthService);

  navItems: NavItem[] = this.router.config
    .filter(route => route.data?.['nav'])
    .map(route => ({
      path: `/${route.path}`,
      label: route.data!['nav'].label as string,
      icon: route.data!['nav'].icon as string,
    }));

  initials = computed(() =>
    (this.auth.user()?.username ?? '').slice(0, 2).toUpperCase()
  );
}
