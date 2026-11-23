
import { Component, OnInit, signal } from '@angular/core';
import {
  Router,
  RouterLink,
  RouterLinkActive,
} from '@angular/router';

import { AuthService } from '../../../../core/auth.service';
import { RequestsApiService, type ClientRequestSummary } from '../../../../requests/requests-api.service';

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
export class ClientDashboard implements OnInit {
  readonly requests = signal<ClientRequestSummary[]>([]);
  readonly requestsLoading = signal(true);
  readonly requestsError = signal('');

  constructor(
    private readonly authService: AuthService,
    private readonly router: Router,
    private readonly requestsApi: RequestsApiService,
  ) {}

  ngOnInit(): void {
    const token = this.authService.getAccessToken();
    if (!token) {
      this.requestsError.set('Inicia sesión para consultar tus solicitudes.');
      this.requestsLoading.set(false);
      return;
    }

    this.requestsApi.getMyRequests(token).subscribe({
      next: (requests) => {
        this.requests.set(requests);
        this.requestsLoading.set(false);
      },
      error: () => {
        this.requestsError.set('No se pudieron cargar tus solicitudes.');
        this.requestsLoading.set(false);
      },
    });
  }

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
