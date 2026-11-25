import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { AuthService } from '../../../../core/auth.service';
import {
  CatalogApiService,
  type CatalogCategory,
  type CatalogZone,
} from '../../../../core/catalog-api.service.js';
import { WorkerApiService } from '../worker-api.service.js';

interface ScheduleDay {
  weekday: number;
  name: string;
  enabled: boolean;
  startsAt: string;
  endsAt: string;
}

@Component({
  selector: 'app-worker-profile',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './profile.html',
  styleUrl: './profile.css',
})
export class WorkerProfilePage implements OnInit {
  private readonly formBuilder = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly catalogApi = inject(CatalogApiService);
  private readonly workerApi = inject(WorkerApiService);

  readonly categories = signal<CatalogCategory[]>([]);
  readonly zones = signal<CatalogZone[]>([]);

  readonly selectedCategoryIds = signal<string[]>([]);
  readonly selectedZoneIds = signal<string[]>([]);

  readonly schedules = signal<ScheduleDay[]>([
    { weekday: 0, name: 'Domingo', enabled: false, startsAt: '08:00', endsAt: '17:00' },
    { weekday: 1, name: 'Lunes', enabled: false, startsAt: '08:00', endsAt: '17:00' },
    { weekday: 2, name: 'Martes', enabled: false, startsAt: '08:00', endsAt: '17:00' },
    { weekday: 3, name: 'Miércoles', enabled: false, startsAt: '08:00', endsAt: '17:00' },
    { weekday: 4, name: 'Jueves', enabled: false, startsAt: '08:00', endsAt: '17:00' },
    { weekday: 5, name: 'Viernes', enabled: false, startsAt: '08:00', endsAt: '17:00' },
    { weekday: 6, name: 'Sábado', enabled: false, startsAt: '08:00', endsAt: '17:00' },
  ]);

  readonly isLoading = signal(true);
  readonly isSaving = signal(false);
  readonly feedback = signal('');
  readonly feedbackType = signal<'info' | 'error' | 'success'>('info');
  readonly reviewStatus = signal<'pending' | 'approved' | 'rejected'>('pending');

  readonly form = this.formBuilder.nonNullable.group({
    bio: ['', [Validators.required, Validators.maxLength(1000)]],
  });

  ngOnInit(): void {
    this.loadCatalogs();
    this.loadProfile();
  }

  private loadCatalogs(): void {
    this.catalogApi.getCategories().subscribe({
      next: (items) => this.categories.set(items),
      error: () => this.showFeedback('No se pudieron cargar las especialidades.', 'error'),
    });

    this.catalogApi.getZones().subscribe({
      next: (items) => this.zones.set(items),
      error: () => this.showFeedback('No se pudieron cargar las zonas de servicio.', 'error'),
    });
  }

  private loadProfile(): void {
    const token = this.authService.getAccessToken();

    if (!token) {
      this.isLoading.set(false);
      this.showFeedback('Tu sesión expiró. Inicia sesión nuevamente.', 'error');
      return;
    }

    this.workerApi.getProfile(token).subscribe({
      next: (profile) => {
        this.form.controls.bio.setValue(profile.bio ?? '');
        this.selectedCategoryIds.set(profile.categoryIds);
        this.selectedZoneIds.set(profile.zoneIds);
        this.reviewStatus.set(profile.review_status);

        const savedSchedules = new Map(
          profile.availability.map((item) => [item.weekday, item]),
        );

        this.schedules.update((days) =>
          days.map((day) => {
            const saved = savedSchedules.get(day.weekday);

            return saved
              ? {
                  ...day,
                  enabled: true,
                  startsAt: saved.starts_at.slice(0, 5),
                  endsAt: saved.ends_at.slice(0, 5),
                }
              : day;
          }),
        );

        this.isLoading.set(false);
      },
      error: (error: unknown) => {
        this.isLoading.set(false);
        this.showFeedback(
          this.apiErrorMessage(error, 'No se pudo cargar tu perfil.'),
          'error',
        );
      },
    });
  }

  toggleCategory(categoryId: string, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;

    this.selectedCategoryIds.update((ids) =>
      checked ? [...ids, categoryId] : ids.filter((id) => id !== categoryId),
    );
  }

  toggleZone(zoneId: string, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;

    this.selectedZoneIds.update((ids) =>
      checked ? [...ids, zoneId] : ids.filter((id) => id !== zoneId),
    );
  }

  toggleDay(weekday: number, event: Event): void {
    const enabled = (event.target as HTMLInputElement).checked;

    this.schedules.update((days) =>
      days.map((day) =>
        day.weekday === weekday ? { ...day, enabled } : day,
      ),
    );
  }

  updateScheduleTime(
    weekday: number,
    field: 'startsAt' | 'endsAt',
    event: Event,
  ): void {
    const value = (event.target as HTMLInputElement).value;

    this.schedules.update((days) =>
      days.map((day) =>
        day.weekday === weekday ? { ...day, [field]: value } : day,
      ),
    );
  }

  saveProfile(): void {
    void this.persistProfile(false);
  }

  sendForReview(): void {
    if (this.reviewStatus() === 'approved') {
      this.showFeedback(
        'Tu perfil ya está aprobado. Puedes guardar cambios sin volver a enviarlo a revisión.',
        'info',
      );
      return;
    }

    void this.persistProfile(true);
  }

  private async persistProfile(sendForReview: boolean): Promise<void> {
    if (this.isSaving() || this.isLoading()) return;

    const token = this.authService.getAccessToken();

    if (!token) {
      this.showFeedback('Tu sesión expiró. Inicia sesión nuevamente.', 'error');
      return;
    }

    this.form.markAllAsTouched();

    const enabledSchedules = this.schedules().filter((day) => day.enabled);

    const invalidSchedule = enabledSchedules.some(
      (day) => !day.startsAt || !day.endsAt || day.endsAt <= day.startsAt,
    );

    if (
      this.form.invalid ||
      this.selectedCategoryIds().length === 0 ||
      this.selectedZoneIds().length === 0 ||
      enabledSchedules.length === 0 ||
      invalidSchedule
    ) {
      this.showFeedback(
        'Completa tu presentación, selecciona al menos una especialidad y una zona, y configura horarios válidos.',
        'error',
      );
      return;
    }

    const payload = {
      bio: this.form.getRawValue().bio.trim(),
      categoryIds: this.selectedCategoryIds(),
      zoneIds: this.selectedZoneIds(),
      availability: enabledSchedules.map((day) => ({
        weekday: day.weekday,
        startsAt: day.startsAt,
        endsAt: day.endsAt,
      })),
    };

    this.isSaving.set(true);
    this.showFeedback(
      sendForReview ? 'Guardando y enviando tu perfil a revisión…' : 'Guardando cambios…',
      'info',
    );

    try {
      await firstValueFrom(this.workerApi.updateProfile(payload, token));

      if (sendForReview) {
        await firstValueFrom(this.workerApi.submitForReview(token));
        this.reviewStatus.set('pending');
        this.authService.updateWorkerReviewStatus('pending');
        await this.router.navigate(['/trabajador/pendiente']);
      } else {
        this.showFeedback('Tus cambios se guardaron correctamente.', 'success');
      }
    } catch (error) {
      this.showFeedback(
        this.apiErrorMessage(error, 'No se pudieron guardar los cambios.'),
        'error',
      );
    } finally {
      this.isSaving.set(false);
    }
  }

  private showFeedback(
    message: string,
    type: 'info' | 'error' | 'success',
  ): void {
    this.feedback.set(message);
    this.feedbackType.set(type);
  }

  private apiErrorMessage(error: unknown, fallback: string): string {
    if (!(error instanceof HttpErrorResponse)) return fallback;

    const message = error.error?.message;

    if (Array.isArray(message)) return message.join(' ');
    if (typeof message === 'string' && message.trim()) return message;
    if (error.status === 0) return 'No se pudo conectar con la API.';
    if (error.status === 401) return 'Tu sesión expiró. Inicia sesión nuevamente.';

    return fallback;
  }
}