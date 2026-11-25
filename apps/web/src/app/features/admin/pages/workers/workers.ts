
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { AuthService } from '../../../../core/auth.service';
import { AdminApiService } from '../../services/admin-api.service';
import { AdminWorker } from '../../models/admin.models';

type ReviewDecision = 'approved' | 'rejected';

@Component({
  selector: 'app-admin-workers',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './workers.html',
  styleUrl: './workers.css',
})
export class AdminWorkers implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly adminApi = inject(AdminApiService);
  private readonly router = inject(Router);

  workers: AdminWorker[] = [];
  selectedWorker: AdminWorker | null = null;
  reviewDecision: ReviewDecision | null = null;

  reviewNotes = '';
  loading = true;
  submitting = false;

  errorMessage = '';
  successMessage = '';

  ngOnInit(): void {
    this.loadWorkers();
  }

  loadWorkers(): void {
    const token = this.authService.getAccessToken();

    if (!token) {
      this.router.navigate(['/login']);
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    this.adminApi.getPendingWorkers(token).subscribe({
      next: (workers) => {
        this.workers = workers;
        this.loading = false;
      },
      error: () => {
        this.errorMessage =
          'No se pudieron cargar los trabajadores pendientes.';
        this.loading = false;
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

    if (!token || !this.selectedWorker || !this.reviewDecision) {
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
    ).subscribe({
      next: (response) => {
        this.workers = this.workers.filter(
          (worker) => worker.user_id !== workerId,
        );

        this.successMessage = response.message;
        this.selectedWorker = null;
        this.reviewDecision = null;
        this.reviewNotes = '';
        this.submitting = false;
      },
      error: (error) => {
        this.errorMessage =
          error?.error?.message ??
          'No se pudo registrar la decisión. Intenta nuevamente.';
        this.submitting = false;
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
}
