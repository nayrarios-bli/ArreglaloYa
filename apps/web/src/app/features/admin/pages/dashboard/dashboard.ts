
import { Component, OnInit, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../../core/auth.service';
import { AdminApiService } from '../../services/admin-api.service';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class AdminDashboard implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly adminApi = inject(AdminApiService);
  private readonly router = inject(Router);

  adminName = this.authService.getUser()?.fullName ?? 'Administrador';

  pendingCount = 0;
  loading = true;
  errorMessage = '';

  ngOnInit(): void {
    this.loadPendingCount();
  }

  loadPendingCount(): void {
    const token = this.authService.getAccessToken();

    if (!token) {
      this.router.navigate(['/login']);
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    this.adminApi.getPendingWorkers(token).subscribe({
      next: (workers) => {
        this.pendingCount = workers.length;
        this.loading = false;
      },
      error: () => {
        this.errorMessage =
          'No se pudo cargar la información de los trabajadores pendientes.';
        this.loading = false;
      },
    });
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
