import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, shareReplay } from 'rxjs';
import { API_URL } from './api-url.js';

export interface CatalogCategory {
  id: string;
  name: string;
  description: string | null;
}

export interface CatalogZone {
  id: string;
  name: string;
  city: string;
}

@Injectable({ providedIn: 'root' })
export class CatalogApiService {
  private readonly http = inject(HttpClient);
  private readonly categories$ = this.http
    .get<CatalogCategory[]>(`${API_URL}/catalog/categories`)
    .pipe(shareReplay({ bufferSize: 1, refCount: false }));
  private readonly zones$ = this.http
    .get<CatalogZone[]>(`${API_URL}/catalog/zones`)
    .pipe(shareReplay({ bufferSize: 1, refCount: false }));

  getCategories(): Observable<CatalogCategory[]> {
    return this.categories$;
  }

  getZones(): Observable<CatalogZone[]> {
    return this.zones$;
  }
}
