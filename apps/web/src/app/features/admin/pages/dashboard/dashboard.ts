
import { ChangeDetectorRef, Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize, timeout } from 'rxjs';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../../core/auth.service';
import { AdminApiService } from '../../services/admin-api.service';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.css', '../../admin-panels.css'],
})
export class AdminDashboard implements OnInit {
  private readonly changeDetector = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);
  private readonly authService = inject(AuthService);
  private readonly adminApi = inject(AdminApiService);
  private readonly router = inject(Router);

  adminName = this.authService.getUser()?.fullName ?? 'Administrador';

  pendingCount = 0;
  loading = false;
  errorMessage = '';

  ngOnInit(): void {
    this.loadPendingCount();
  }

  loadPendingCount(): void {
    if (this.loading) return;
    const token = this.authService.getAccessToken();

    if (!token) {
      this.router.navigate(['/login']);
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    this.adminApi.getPendingWorkerCount(token).pipe(
      timeout(12000),
      takeUntilDestroyed(this.destroyRef),
      finalize(() => {
        this.loading = false;
        this.changeDetector.markForCheck();
      }),
    ).subscribe({
      next: ({ count }) => {
        this.pendingCount = count;
      },
      error: () => {
        this.errorMessage =
          'No se pudo cargar la información de los trabajadores pendientes.';
      },
    });
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
