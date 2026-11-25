
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_URL } from '../../../core/api-url.js';

import {
  AdminWorker,
  ReviewWorkerPayload,
  ReviewWorkerResponse,
} from '../models/admin.models';

@Injectable({ providedIn: 'root' })
export class AdminApiService {
  private readonly http = inject(HttpClient);
  private readonly endpoint = `${API_URL}/admin`;

  private headers(token: string): HttpHeaders {
    return new HttpHeaders({
      Authorization: `Bearer ${token}`,
    });
  }

  getPendingWorkers(token: string): Observable<AdminWorker[]> {
    return this.http.get<AdminWorker[]>(
      `${this.endpoint}/workers/pending`,
      { headers: this.headers(token) },
    );
  }

  getPendingWorkerCount(token: string): Observable<{ count: number }> {
    return this.http.get<{ count: number }>(`${this.endpoint}/workers/pending/count`, {
      headers: this.headers(token),
    });
  }

  reviewWorker(
    workerId: string,
    payload: ReviewWorkerPayload,
    token: string,
  ): Observable<ReviewWorkerResponse> {
    return this.http.patch<ReviewWorkerResponse>(
      `${this.endpoint}/workers/${workerId}/review`,
      payload,
      { headers: this.headers(token) },
    );
  }
}
