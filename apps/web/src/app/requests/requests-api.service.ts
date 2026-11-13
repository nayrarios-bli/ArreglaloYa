import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_URL } from '../core/api-url.js';

export interface CreateRequestPayload {
  categoryId: string;
  title: string;
  description: string;
  availableFrom?: string;
  availableUntil?: string;
}

export interface CreatedRequest {
  id: string;
  title: string;
  description: string;
  category_id: string;
  zone_id: string;
  status: string;
}

export interface UploadedRequestAttachment {
  id: string;
  storage_path: string;
  uploaded_at: string;
  signedUrl: string;
  signedUrlExpiresInSeconds: number;
}

@Injectable({ providedIn: 'root' })
export class RequestsApiService {
  private readonly http = inject(HttpClient);

  createRequest(
    payload: CreateRequestPayload,
    accessToken: string,
  ): Observable<CreatedRequest> {
    return this.http.post<CreatedRequest>(`${API_URL}/requests`, payload, {
      headers: new HttpHeaders({ Authorization: `Bearer ${accessToken}` }),
    });
  }

  uploadAttachment(
    requestId: string,
    file: File,
    accessToken: string,
  ): Observable<UploadedRequestAttachment> {
    const formData = new FormData();
    formData.append('file', file, file.name);

    return this.http.post<UploadedRequestAttachment>(
      `${API_URL}/requests/${requestId}/attachments`,
      formData,
      { headers: new HttpHeaders({ Authorization: `Bearer ${accessToken}` }) },
    );
  }
}
