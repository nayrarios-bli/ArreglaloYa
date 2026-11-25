import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ComplaintsService, type Complaint } from './complaints.service';

@Component({
  selector: 'app-admin-complaints-page',
  standalone: true,
  imports: [RouterLink, DatePipe],
  templateUrl: './admin-complaints.page.html',
  styleUrl: './admin-complaints.page.css',
})
export class AdminComplaintsPage implements OnInit {
  private readonly complaintsService = inject(ComplaintsService);

  readonly complaints = signal<Complaint[]>([]);
  readonly loading = signal(false);
  readonly errorMessage = signal('');

  ngOnInit(): void {
    this.loadComplaints();
  }

  loadComplaints(): void {
    this.loading.set(true);
    this.errorMessage.set('');

    this.complaintsService.getAllComplaints().subscribe({
      next: (complaints) => {
        this.loading.set(false);
        this.complaints.set(complaints);
      },
      error: (error: unknown) => {
        this.loading.set(false);
        this.complaints.set([]);
        this.errorMessage.set(this.extractMessage(error));
      },
    });
  }

  statusLabel(status: string): string {
    const labels: Record<string, string> = {
      open: 'Abierto',
      in_review: 'En revisión',
      resolved: 'Resuelto',
      closed: 'Cerrado',
      rejected: 'Rechazado',
    };

    return labels[status] ?? status;
  }

  private extractMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 403) {
        return 'No tienes permisos de administrador para ver todos los reclamos.';
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

      return 'No se pudieron cargar los reclamos.';
    }

    if (error instanceof Error && error.message) {
      return error.message;
    }

    return 'No se pudieron cargar los reclamos.';
  }
}
