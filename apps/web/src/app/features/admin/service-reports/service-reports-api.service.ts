import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { API_URL } from '../../../core/api-url';
import { AuthService } from '../../../core/auth.service';

export interface ServiceReportFilters {
  startDate: string;
  endDate: string;
  categoryId?: string;
}

export interface ServiceReportSummary {
  totalRequests: number;
  completedServices: number;
  cancelledServices: number;
  cancellationRate: number;
}

export interface CategoryRanking {
  categoryId: string;
  name: string;
  requests: number;
  completed: number;
  cancelled: number;
}

export interface TimelinePoint {
  date: string;
  completed: number;
  cancelled: number;
}

export interface ServiceReport {
  reportId: string;
  generatedAt: string;
  filters: {
    startDate: string;
    endDate: string;
    categoryId: string | null;
    categoryName: string | null;
  };
  summary: ServiceReportSummary;
  topCategories: CategoryRanking[];
  timeline: TimelinePoint[];
}

export interface ReportHistoryItem {
  id: string;
  startDate: string;
  endDate: string;
  categoryId: string | null;
  categoryName: string | null;
  totalRequests: number;
  completedServices: number;
  cancelledServices: number;
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class ServiceReportsApiService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);

  // Genera el reporte en el backend y lo guarda en la base de datos.
  generate(filters: ServiceReportFilters): Observable<ServiceReport> {
    const headers = this.headers();
    if (!headers) return throwError(() => new Error('No hay una sesión activa.'));

    // Solo se envía la categoría cuando el administrador eligió una.
    const body: ServiceReportFilters = {
      startDate: filters.startDate,
      endDate: filters.endDate,
      ...(filters.categoryId ? { categoryId: filters.categoryId } : {}),
    };

    return this.http.post<ServiceReport>(`${API_URL}/admin/service-reports`, body, {
      headers,
    });
  }

  history(): Observable<ReportHistoryItem[]> {
    const headers = this.headers();
    if (!headers) return throwError(() => new Error('No hay una sesión activa.'));

    return this.http.get<ReportHistoryItem[]>(
      `${API_URL}/admin/service-reports/history`,
      { headers },
    );
  }

  private headers(): HttpHeaders | null {
    const token = this.auth.getAccessToken();
    return token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : null;
  }
}
