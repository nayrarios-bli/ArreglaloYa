import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { AuthService } from '../../core/auth.service';
import {
  ReviewsService,
  type CreateReviewPayload,
  type Review,
} from './reviews.service';

@Component({
  selector: 'app-review-create-page',
  standalone: true,
  imports: [FormsModule, RouterLink, DatePipe],
  templateUrl: './review-create.page.html',
  styleUrl: './review-create.page.css',
})
export class ReviewCreatePage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly reviewsService = inject(ReviewsService);
  private readonly authService = inject(AuthService);

  readonly scores = [1, 2, 3, 4, 5];

  serviceId = '';
  score = 0;
  comment = '';

  readonly reviews = signal<Review[]>([]);
  readonly loadingReviews = signal(false);
  readonly submitting = signal(false);
  readonly successMessage = signal('');
  readonly errorMessage = signal('');
  readonly listError = signal('');

  ngOnInit(): void {
    const serviceId = this.route.snapshot.paramMap.get('serviceId') ?? '';
    this.serviceId = serviceId;

    if (!serviceId) {
      this.listError.set('No se indicó el servicio a calificar.');
      return;
    }

    this.loadReviews();
  }

  loadReviews(): void {
    if (!this.serviceId) {
      return;
    }

    this.loadingReviews.set(true);
    this.listError.set('');

    this.reviewsService.getServiceReviews(this.serviceId).subscribe({
      next: (reviews) => {
        this.loadingReviews.set(false);
        this.reviews.set(reviews);
      },
      error: (error: unknown) => {
        this.loadingReviews.set(false);
        this.listError.set(
          this.extractMessage(error, 'No se pudieron cargar las calificaciones.'),
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

    if (!this.serviceId) {
      this.errorMessage.set('No se indicó el servicio a calificar.');
      return;
    }

    if (!this.authService.isAuthenticated()) {
      this.errorMessage.set('Debes iniciar sesión para calificar un servicio.');
      return;
    }

    if (this.score < 1 || this.score > 5) {
      this.errorMessage.set('Selecciona una puntuación entre 1 y 5.');
      return;
    }

    const comment = this.comment.trim();
    if (comment.length > 1000) {
      this.errorMessage.set('El comentario no puede superar los 1000 caracteres.');
      return;
    }

    const payload: CreateReviewPayload = {
      serviceId: this.serviceId,
      score: this.score,
      comment: comment || undefined,
    };

    this.submitting.set(true);

    this.reviewsService.createReview(payload).subscribe({
      next: () => {
        this.submitting.set(false);
        this.score = 0;
        this.comment = '';
        this.successMessage.set('¡Gracias! Tu calificación se guardó correctamente.');
        this.loadReviews();
      },
      error: (error: unknown) => {
        this.submitting.set(false);
        this.errorMessage.set(
          this.extractMessage(error, 'No se pudo guardar la calificación.'),
        );
      },
    });
  }

  starsFor(score: number): string {
    return '★'.repeat(Math.min(5, Math.max(0, score)));
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
