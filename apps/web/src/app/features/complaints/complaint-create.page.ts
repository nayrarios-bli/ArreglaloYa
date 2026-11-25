import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import {
  ComplaintsService,
  type Complaint,
  type CreateComplaintPayload,
} from './complaints.service';

@Component({
  selector: 'app-complaint-create-page',
  standalone: true,
  imports: [FormsModule, RouterLink, DatePipe],
  templateUrl: './complaint-create.page.html',
  styleUrl: './complaint-create.page.css',
})
export class ComplaintCreatePage implements OnInit {
  private readonly complaintsService = inject(ComplaintsService);
  private readonly authService = inject(AuthService);

  serviceId = '';
  description = '';

  readonly myComplaints = signal<Complaint[]>([]);
  readonly loadingComplaints = signal(false);
  readonly submitting = signal(false);
  readonly successMessage = signal('');
  readonly errorMessage = signal('');
  readonly listError = signal('');

  ngOnInit(): void {
    this.loadMyComplaints();
  }

  loadMyComplaints(): void {
    this.loadingComplaints.set(true);
    this.listError.set('');

    this.complaintsService.getMyComplaints().subscribe({
      next: (complaints) => {
        this.loadingComplaints.set(false);
        this.myComplaints.set(complaints);
      },
      error: (error: unknown) => {
        this.loadingComplaints.set(false);
        this.listError.set(
          this.extractMessage(error, 'No se pudieron cargar tus reclamos.'),
        );
      },
    });
  }

  submit(): void {
    this.successMessage.set('');
    this.errorMessage.set('');

    if (this.submitting()) {
      return;
    }

    if (!this.authService.isAuthenticated()) {
      this.errorMessage.set('Debes iniciar sesión para registrar un reclamo.');
      return;
    }

    const serviceId = this.serviceId.trim();
    if (!serviceId) {
      this.errorMessage.set('Ingresa el identificador del servicio.');
      return;
    }

    const description = this.description.trim();
    if (description.length < 20) {
      this.errorMessage.set(
        'La descripción debe tener al menos 20 caracteres.',
      );
      return;
    }

    if (description.length > 3000) {
      this.errorMessage.set(
        'La descripción no puede superar los 3000 caracteres.',
      );
      return;
    }

    const payload: CreateComplaintPayload = { serviceId, description };

    this.submitting.set(true);

    this.complaintsService.createComplaint(payload).subscribe({
      next: () => {
        this.submitting.set(false);
        this.serviceId = '';
        this.description = '';
        this.successMessage.set('Tu reclamo se registró correctamente.');
        this.loadMyComplaints();
      },
      error: (error: unknown) => {
        this.submitting.set(false);
        this.errorMessage.set(
          this.extractMessage(error, 'No se pudo registrar el reclamo.'),
        );
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

  private extractMessage(error: unknown, fallback: string): string {
    if (error instanceof HttpErrorResponse) {
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

      return fallback;
    }

    if (error instanceof Error && error.message) {
      return error.message;
    }

    return fallback;
  }
}
