import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/auth.service';
import { CompatibleRequestsApiService } from '../compatible-requests/compatible-requests-api.service';

@Component({
  selector: 'app-worker-dashboard',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class WorkerDashboard implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly requestsApi = inject(CompatibleRequestsApiService);
  private readonly router = inject(Router);

  readonly firstName = computed(() => {
    const fullName = this.auth.getUser()?.fullName?.trim() ?? '';
    return fullName.split(/\s+/)[0] || 'trabajador';
  });
  readonly greeting = computed(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Buenos días';
    if (hour < 19) return 'Buenas tardes';
    return 'Buenas noches';
  });

  readonly compatibleCount = signal<number | null>(null);
  readonly loading = signal(true);
  readonly error = signal('');

  ngOnInit(): void {
    this.loadCompatibleRequests();
  }

  loadCompatibleRequests(): void {
    const token = this.auth.getAccessToken();
    if (!token) {
      this.loading.set(false);
      this.error.set('Tu sesión expiró. Inicia sesión para continuar.');
      return;
    }

    this.loading.set(true);
    this.error.set('');
    this.requestsApi.list(token).subscribe({
      next: ({ requests }) => {
        this.compatibleCount.set(requests.length);
        this.loading.set(false);
      },
      error: (error: HttpErrorResponse) => {
        this.error.set(this.errorMessage(error));
        this.loading.set(false);
      },
    });
  }

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/login']);
  }

  private errorMessage(error: HttpErrorResponse): string {
    const message = error.error?.message;
    if (Array.isArray(message)) return message.join(' ');
    if (typeof message === 'string' && message) return message;
    if (error.status === 0) return 'No se pudo conectar con la API. Inténtalo nuevamente.';
    if (error.status === 401) return 'Tu sesión expiró. Inicia sesión nuevamente.';
    if (error.status === 403) return 'Tu perfil debe estar aprobado para consultar solicitudes.';
    return `No se pudieron cargar las solicitudes (error ${error.status}).`;
  }
}
