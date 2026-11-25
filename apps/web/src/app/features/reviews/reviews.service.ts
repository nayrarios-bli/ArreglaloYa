import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { API_URL } from '../../core/api-url';
import { AuthService } from '../../core/auth.service';

export interface Review {
  id: string;
  service_id: string;
  author_id: string;
  subject_id: string;
  score: number;
  comment: string | null;
  created_at: string;
}

export interface CreateReviewPayload {
  serviceId: string;
  score: number;
  comment?: string;
}

@Injectable({ providedIn: 'root' })
export class ReviewsService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);

  createReview(payload: CreateReviewPayload): Observable<Review> {
    const headers = this.authHeaders();
    if (!headers) {
      return throwError(() => new Error('No hay una sesión activa.'));
    }

    return this.http.post<Review>(`${API_URL}/reviews`, payload, { headers });
  }

  getServiceReviews(serviceId: string): Observable<Review[]> {
    const headers = this.authHeaders();
    if (!headers) {
      return throwError(() => new Error('No hay una sesión activa.'));
    }

    return this.http.get<Review[]>(
      `${API_URL}/reviews/service/${encodeURIComponent(serviceId)}`,
      { headers },
    );
  }

  private authHeaders(): HttpHeaders | null {
    const token = this.authService.getAccessToken();
    if (!token) {
      return null;
    }

    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }
}
