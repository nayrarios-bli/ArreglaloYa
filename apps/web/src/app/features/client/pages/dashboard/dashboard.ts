
import { Component } from '@angular/core';
import {
  Router,
  RouterLink,
  RouterLinkActive,
} from '@angular/router';

import { AuthService } from '../../../../core/auth.service';

@Component({
  selector: 'app-client-dashboard',
  standalone: true,
  imports: [
    RouterLink,
    RouterLinkActive,
  ],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class ClientDashboard {
  constructor(
    private readonly authService: AuthService,
    private readonly router: Router,
  ) {}

  get firstName(): string {
    const fullName =
      this.authService.getUser()?.fullName ?? 'Cliente';

    return fullName.trim().split(/\s+/).slice(0, 2).join(' ') || 'Cliente';
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
