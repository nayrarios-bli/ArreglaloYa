

import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../../core/auth.service';

@Component({
  selector: 'app-client-dashboard',
  standalone: true,
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class ClientDashboard {
  constructor(
    private readonly authService: AuthService,
    private readonly router: Router,
  ) {}

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
