import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_URL } from '../../../core/api-url.js';

export interface WorkerAvailability {
  id?: string;
  weekday: number;
  starts_at: string;
  ends_at: string;
}

export interface WorkerProfile {
  user_id: string;
  bio: string | null;
  review_status: 'pending' | 'approved' | 'rejected';
  categoryIds: string[];
  zoneIds: string[];
  availability: WorkerAvailability[];
  documents: WorkerDocument[];
}

export type WorkerDocumentType = 'identity_card' | 'criminal_record';

export interface WorkerDocument {
  document_type: WorkerDocumentType;
  uploaded_at: string;
}

export interface UpdateWorkerProfilePayload {
  bio?: string;
  categoryIds?: string[];
  zoneIds?: string[];
  availability?: {
    weekday: number;
    startsAt: string;
    endsAt: string;
  }[];
}

@Injectable({ providedIn: 'root' })
export class WorkerApiService {
  private readonly http = inject(HttpClient);
  private readonly endpoint = `${API_URL}/workers/me`;

  private headers(token: string): HttpHeaders {
    return new HttpHeaders({
      Authorization: `Bearer ${token}`,
    });
  }

  getProfile(token: string): Observable<WorkerProfile> {
    return this.http.get<WorkerProfile>(this.endpoint, {
      headers: this.headers(token),
    });
  }

  updateProfile(
    payload: UpdateWorkerProfilePayload,
    token: string,
  ): Observable<WorkerProfile> {
    return this.http.put<WorkerProfile>(this.endpoint, payload, {
      headers: this.headers(token),
    });
  }

  submitForReview(
    token: string,
  ): Observable<{ message: string; reviewStatus: string }> {
    return this.http.post<{ message: string; reviewStatus: string }>(
      `${this.endpoint}/submit`,
      {},
      { headers: this.headers(token) },
    );
  }

  uploadDocument(
    documentType: WorkerDocumentType,
    file: File,
    token: string,
  ): Observable<WorkerDocument> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<WorkerDocument>(
      `${this.endpoint}/documents/${documentType}`,
      formData,
      { headers: this.headers(token) },
    );
  }
}
