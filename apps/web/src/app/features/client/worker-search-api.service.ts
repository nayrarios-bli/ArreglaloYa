
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_URL } from '../../core/api-url.js';

export interface WorkerSearchFilters {
  categoryId?: string;
  minRating?: number;
  weekday?: number;
  startsAt?: string;
  endsAt?: string;
  page?: number;
  pageSize?: number;
}

export interface WorkerSearchResult {
  id: string;
  fullName: string;
  bio: string | null;
  averageRating: number | null;
  reviewCount: number;
  categories: {
    id: string;
    name: string;
  }[];
}

export interface WorkerSearchResponse {
  items: WorkerSearchResult[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

@Injectable({
  providedIn: 'root',
})
export class WorkerSearchApiService {
  private readonly http = inject(HttpClient);

  searchWorkers(
    filters: WorkerSearchFilters,
    accessToken: string,
  ): Observable<WorkerSearchResponse> {
    let params = new HttpParams();

    if (filters.categoryId) {
      params = params.set('categoryId', filters.categoryId);
    }

    if (filters.minRating !== undefined) {
      params = params.set('minRating', filters.minRating);
    }

    if (filters.weekday !== undefined) {
      params = params.set('weekday', filters.weekday);
    }

    if (filters.startsAt) {
      params = params.set('startsAt', filters.startsAt);
    }

    if (filters.endsAt) {
      params = params.set('endsAt', filters.endsAt);
    }

    params = params
      .set('page', filters.page ?? 1)
      .set('pageSize', filters.pageSize ?? 6);

    const headers = new HttpHeaders({
      Authorization: `Bearer ${accessToken}`,
    });

    return this.http.get<WorkerSearchResponse>(
      `${API_URL}/workers/search`,
      { headers, params },
    );
  }
}
