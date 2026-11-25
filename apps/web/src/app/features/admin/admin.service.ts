import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { API_URL } from '../../core/api-url';
import { AuthService } from '../../core/auth.service';

export interface AdminReportFilters {
  startDate?: string;
  endDate?: string;
}

export interface AdminReportMetrics {
  totalUsers: number;
  clients: number;
  workers: number;
  completedServices: number;
  pendingComplaints: number;
  averageRating: number | null;
}

export interface AdminReport {
  generatedAt: string;
  filtersApplied: {
    startDate: string | null;
    endDate: string | null;
  };
  metrics: AdminReportMetrics;
}

@Injectable({ providedIn: 'root' })
export class AdminService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);

  getReports(filters: AdminReportFilters = {}): Observable<AdminReport> {
    const headers = this.authHeaders();
    if (!headers) {
      return throwError(() => new Error('No hay una sesión activa.'));
    }

    let params = new HttpParams();
    if (filters.startDate) {
      params = params.set('startDate', filters.startDate);
    }
    if (filters.endDate) {
      params = params.set('endDate', filters.endDate);
    }

    return this.http.get<AdminReport>(`${API_URL}/admin/reports`, {
      headers,
      params,
    });
  }

  private authHeaders(): HttpHeaders | null {
    const token = this.authService.getAccessToken();
    if (!token) {
      return null;
    }

    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }
}
