
import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { AuthService } from '../../../../core/auth.service';
import {
  CatalogApiService,
  type CatalogCategory,
} from '../../../../core/catalog-api.service';

import {
  WorkerSearchApiService,
  type WorkerSearchResult,
} from '../../worker-search-api.service';

@Component({
  selector: 'app-worker-search',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './worker-search.html',
  styleUrl: './worker-search.css',
})
export class WorkerSearchPage implements OnInit {
  readonly categories = signal<CatalogCategory[]>([]);
  readonly workers = signal<WorkerSearchResult[]>([]);

  readonly loading = signal(false);
  readonly error = signal('');
  readonly categoriesError = signal('');

  readonly total = signal(0);
  readonly currentPage = signal(1);
  readonly pageSize = 6;
  readonly totalPages = signal(0);

  categoryId = '';
  minRating: number | null = null;

  weekday: number | null = null;
  startsAt = '';
  endsAt = '';

  constructor(
    private readonly authService: AuthService,
    private readonly catalogApi: CatalogApiService,
    private readonly workerSearchApi: WorkerSearchApiService,
  ) {}

  ngOnInit(): void {
    this.loadCategories();
    this.searchWorkers();
  }

  loadCategories(): void {
    this.catalogApi.getCategories().subscribe({
      next: (categories) => {
        this.categories.set(categories);
      },
      error: () => {
        this.categoriesError.set(
          'No se pudieron cargar las categorías.',
        );
      },
    });
  }

  searchWorkers(page = 1): void {
    const token = this.authService.getAccessToken();

    if (!token) {
      this.error.set('Tu sesión no está disponible. Inicia sesión nuevamente.');
      return;
    }

    if (
      this.weekday !== null &&
      (!this.startsAt || !this.endsAt)
    ) {
      this.error.set(
        'Para filtrar por disponibilidad debes indicar ambas horas.',
      );
      return;
    }

    if (
      this.weekday !== null &&
      this.startsAt >= this.endsAt
    ) {
      this.error.set(
        'La hora de fin debe ser posterior a la hora de inicio.',
      );
      return;
    }

    this.loading.set(true);
    this.error.set('');

    this.workerSearchApi.searchWorkers(
      {
        categoryId: this.categoryId || undefined,
        minRating: this.minRating ?? undefined,
        weekday: this.weekday ?? undefined,
        startsAt: this.weekday !== null ? this.startsAt : undefined,
        endsAt: this.weekday !== null ? this.endsAt : undefined,
        page,
        pageSize: this.pageSize,
      },
      token,
    ).subscribe({
      next: (response) => {
        this.workers.set(response.items);
        this.total.set(response.total);
        this.currentPage.set(response.page);
        this.totalPages.set(response.totalPages);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(
          err.error?.message ||
          'No se pudo realizar la búsqueda de trabajadores.',
        );
        this.loading.set(false);
      },
    });
  }

  applyFilters(): void {
    this.searchWorkers(1);
  }

  clearFilters(): void {
    this.categoryId = '';
    this.minRating = null;
    this.weekday = null;
    this.startsAt = '';
    this.endsAt = '';

    this.searchWorkers(1);
  }

  previousPage(): void {
    if (this.currentPage() > 1) {
      this.searchWorkers(this.currentPage() - 1);
    }
  }

  nextPage(): void {
    if (this.currentPage() < this.totalPages()) {
      this.searchWorkers(this.currentPage() + 1);
    }
  }

  get firstName(): string {
    const fullName =
      this.authService.getUser()?.fullName ?? 'Cliente';

    return fullName.trim().split(/\s+/)[0] || 'Cliente';
  }
}
