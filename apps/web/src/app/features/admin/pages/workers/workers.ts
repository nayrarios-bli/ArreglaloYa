
import { ChangeDetectorRef, Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize, timeout } from 'rxjs';

import { AuthService } from '../../../../core/auth.service';
import { AdminApiService } from '../../services/admin-api.service';
import { AdminWorker } from '../../models/admin.models';

type ReviewDecision = 'approved' | 'rejected';

@Component({
  selector: 'app-admin-workers',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './workers.html',
  styleUrls: ['./workers.css', '../../admin-panels.css'],
})
export class AdminWorkers implements OnInit {
  private readonly changeDetector = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);
  private readonly authService = inject(AuthService);
  private readonly adminApi = inject(AdminApiService);
  private readonly router = inject(Router);

  workers: AdminWorker[] = [];
  selectedWorker: AdminWorker | null = null;
  reviewDecision: ReviewDecision | null = null;

  reviewNotes = '';
  loading = false;
  submitting = false;

  errorMessage = '';
  successMessage = '';

  ngOnInit(): void {
    this.loadWorkers();
  }

  loadWorkers(): void {
    if (this.loading) return;
    const token = this.authService.getAccessToken();

    if (!token) {
      this.router.navigate(['/login']);
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    this.adminApi.getPendingWorkers(token).pipe(
      timeout(12000),
      takeUntilDestroyed(this.destroyRef),
      finalize(() => {
        this.loading = false;
        this.changeDetector.markForCheck();
      }),
    ).subscribe({
      next: (workers) => {
        this.workers = workers;
      },
      error: (error) => {
        const apiMessage = error?.error?.message;
        this.errorMessage = Array.isArray(apiMessage)
          ? apiMessage.join(' ')
          : apiMessage || (error?.name === 'TimeoutError'
            ? 'La API tardó demasiado en responder. Revisa la consola de NestJS y vuelve a intentar.'
            : 'No se pudieron cargar los trabajadores pendientes. Verifica la sesión y la configuración de Supabase.');
      },
    });
  }

  openReview(worker: AdminWorker, decision: ReviewDecision): void {
    this.selectedWorker = worker;
    this.reviewDecision = decision;
    this.reviewNotes = '';
    this.errorMessage = '';
    this.successMessage = '';
  }

  cancelReview(): void {
    if (this.submitting) {
      return;
    }

    this.selectedWorker = null;
    this.reviewDecision = null;
    this.reviewNotes = '';
  }

  confirmReview(): void {
    const token = this.authService.getAccessToken();

    if (this.submitting || !token || !this.selectedWorker || !this.reviewDecision) {
      return;
    }

    this.submitting = true;
    this.errorMessage = '';

    const workerId = this.selectedWorker.user_id;
    const decision = this.reviewDecision;

    this.adminApi.reviewWorker(
      workerId,
      {
        decision,
        notes: this.reviewNotes.trim() || undefined,
      },
      token,
    ).pipe(
      timeout(12000),
      takeUntilDestroyed(this.destroyRef),
      finalize(() => {
        this.submitting = false;
        this.changeDetector.markForCheck();
      }),
    ).subscribe({
      next: (response) => {
        this.workers = this.workers.filter(
          (worker) => worker.user_id !== workerId,
        );

        this.successMessage = response.message;
        this.selectedWorker = null;
        this.reviewDecision = null;
        this.reviewNotes = '';
      },
      error: (error) => {
        this.errorMessage =
          error?.error?.message ??
          'No se pudo confirmar el resultado. Cierra el diálogo y actualiza la lista antes de reintentar.';
      },
    });
  }

  weekdayName(weekday: number): string {
    const days = [
      'Domingo',
      'Lunes',
      'Martes',
      'Miércoles',
      'Jueves',
      'Viernes',
      'Sábado',
    ];

    return days[weekday] ?? 'Día no definido';
  }

  hasIdentityDocument(worker: AdminWorker): boolean {
    return worker.documents.some((document) =>
      document.document_type === 'identity_card' && !!document.signed_url,
    );
  }
}
