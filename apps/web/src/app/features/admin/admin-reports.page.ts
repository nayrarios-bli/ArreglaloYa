import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AdminService, type AdminReport } from './admin.service';

@Component({
  selector: 'app-admin-reports-page',
  standalone: true,
  imports: [FormsModule, RouterLink, DatePipe],
  templateUrl: './admin-reports.page.html',
  styleUrl: './admin-reports.page.css',
})
export class AdminReportsPage implements OnInit {
  private readonly adminService = inject(AdminService);

  startDate = '';
  endDate = '';

  readonly report = signal<AdminReport | null>(null);
  readonly loading = signal(false);
  readonly errorMessage = signal('');

  ngOnInit(): void {
    this.loadReports();
  }

  loadReports(): void {
    this.errorMessage.set('');

    if (this.startDate && this.endDate && this.startDate > this.endDate) {
      this.errorMessage.set(
        'La fecha inicial no puede ser posterior a la fecha final.',
      );
      return;
    }

    this.loading.set(true);

    this.adminService
      .getReports({
        startDate: this.startDate || undefined,
        endDate: this.endDate || undefined,
      })
      .subscribe({
        next: (report) => {
          this.loading.set(false);
          this.report.set(report);
        },
        error: (error: unknown) => {
          this.loading.set(false);
          this.report.set(null);
          this.errorMessage.set(this.extractMessage(error));
        },
      });
  }

  clearFilters(): void {
    this.startDate = '';
    this.endDate = '';
    this.loadReports();
  }

  private extractMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 403) {
        return 'No tienes permisos de administrador para consultar los reportes.';
      }

      if (error.status === 401) {
        return 'Tu sesión expiró o no es válida. Vuelve a iniciar sesión.';
      }

      if (error.status === 0) {
        return 'No se pudo conectar con la API. Verifica que el servidor esté disponible.';
      }

      const message: unknown = error.error?.message;
      if (Array.isArray(message)) {
        return message.join(' ');
      }

      if (typeof message === 'string' && message.trim()) {
        return message;
      }

      return 'No se pudieron cargar los reportes.';
    }

    if (error instanceof Error && error.message) {
      return error.message;
    }

    return 'No se pudieron cargar los reportes.';
  }
}
