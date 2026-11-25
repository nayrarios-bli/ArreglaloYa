import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { API_URL } from '../../core/api-url';
import { AuthService } from '../../core/auth.service';

export interface Complaint {
  id: string;
  service_id: string;
  opened_by: string;
  description: string;
  status: string;
  assigned_to: string | null;
  resolution: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateComplaintPayload {
  serviceId: string;
  description: string;
}

@Injectable({ providedIn: 'root' })
export class ComplaintsService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);

  createComplaint(payload: CreateComplaintPayload): Observable<Complaint> {
    const headers = this.authHeaders();
    if (!headers) {
      return throwError(() => new Error('No hay una sesión activa.'));
    }

    return this.http.post<Complaint>(`${API_URL}/complaints`, payload, {
      headers,
    });
  }

  getMyComplaints(): Observable<Complaint[]> {
    const headers = this.authHeaders();
    if (!headers) {
      return throwError(() => new Error('No hay una sesión activa.'));
    }

    return this.http.get<Complaint[]>(`${API_URL}/complaints/mine`, {
      headers,
    });
  }

  getAllComplaints(): Observable<Complaint[]> {
    const headers = this.authHeaders();
    if (!headers) {
      return throwError(() => new Error('No hay una sesión activa.'));
    }

    return this.http.get<Complaint[]>(`${API_URL}/complaints`, { headers });
  }

  private authHeaders(): HttpHeaders | null {
    const token = this.authService.getAccessToken();
    if (!token) {
      return null;
    }

    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }
}
