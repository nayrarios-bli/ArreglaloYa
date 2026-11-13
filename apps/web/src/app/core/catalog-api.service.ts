import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, shareReplay } from 'rxjs';
import { API_URL } from './api-url.js';

export interface CatalogCategory {
  id: string;
  name: string;
  description: string | null;
}

@Injectable({ providedIn: 'root' })
export class CatalogApiService {
  private readonly http = inject(HttpClient);
  private readonly categories$ = this.http
    .get<CatalogCategory[]>(`${API_URL}/catalog/categories`)
    .pipe(shareReplay({ bufferSize: 1, refCount: false }));

  getCategories(): Observable<CatalogCategory[]> {
    return this.categories$;
  }
}
