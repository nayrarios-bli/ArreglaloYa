import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../core/auth.service';
import {
  CatalogApiService,
  type CatalogCategory,
  type CatalogZone,
} from '../core/catalog-api.service.js';
import { RequestsApiService } from './requests-api.service.js';

const PREVIEW_CATEGORIES: CatalogCategory[] = [
  { id: 'preview-plomeria', name: 'Plomería', description: null },
  { id: 'preview-electricidad', name: 'Electricidad', description: null },
  { id: 'preview-albanileria', name: 'Albañilería', description: null },
  { id: 'preview-electrodomesticos', name: 'Reparación de electrodomésticos', description: null },
];
const ALLOWED_PHOTO_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_PHOTO_BYTES = 10 * 1024 * 1024;

@Component({
  imports: [ReactiveFormsModule, RouterLink],
  selector: 'app-request-create-page',
  styleUrl: './request-create.page.css',
  templateUrl: './request-create.page.html',
})
export class RequestCreatePage implements OnInit {
  private readonly formBuilder = inject(FormBuilder);
  private readonly catalogApi = inject(CatalogApiService);
  private readonly requestsApi = inject(RequestsApiService);
  private readonly authService = inject(AuthService);

  readonly categories = signal<CatalogCategory[]>([]);
  readonly zones = signal<CatalogZone[]>([]);
  readonly catalogUnavailable = signal(false);
  readonly zonesUnavailable = signal(false);
  readonly selectedPhotos = signal<File[]>([]);
  readonly selectedPhotoNames = signal<string[]>([]);
  readonly feedback = signal('');
  readonly feedbackType = signal<'info' | 'error'>('info');
  readonly isSubmitting = signal(false);
  readonly createdRequestId = signal<string | null>(null);
  readonly pendingPhotos = signal<File[]>([]);
  readonly published = signal(false);

  readonly form = this.formBuilder.nonNullable.group(
    {
      categoryId: ['', Validators.required],
      zoneId: ['', Validators.required],
      title: ['', [Validators.required, Validators.minLength(5), Validators.maxLength(120)]],
      description: ['', [Validators.required, Validators.minLength(20), Validators.maxLength(3000)]],
      availableFrom: [''],
      availableUntil: [''],
    },
    { validators: availabilityRangeValidator },
  );

  ngOnInit(): void {
    this.catalogApi.getCategories().subscribe({
      next: (categories) => {
        this.categories.set(categories);
        this.catalogUnavailable.set(false);
        this.feedback.set('');
      },
      error: (error: HttpErrorResponse) => {
        this.categories.set(PREVIEW_CATEGORIES);
        this.catalogUnavailable.set(true);
        this.feedbackType.set('error');
        this.feedback.set(
          error.status === 0
            ? 'No se pudo conectar con la API. Mostramos categorías de vista previa.'
            : 'No se pudo cargar el catálogo. Mostramos categorías de vista previa.',
        );
      },
    });

    this.catalogApi.getZones().subscribe({
      next: (zones) => {
        this.zones.set(zones);
        this.zonesUnavailable.set(zones.length === 0);
        if (zones.length === 0) {
          this.feedbackType.set('error');
          this.feedback.set('No hay zonas activas para publicar solicitudes.');
        }
      },
      error: () => {
        this.zones.set([]);
        this.zonesUnavailable.set(true);
        this.feedbackType.set('error');
        this.feedback.set('No se pudieron cargar las zonas de servicio.');
      },
    });

    const accessToken = this.authService.getAccessToken();
    if (accessToken) {
      this.requestsApi.getClientZone(accessToken).subscribe({
        next: ({ homeZoneId }) => {
          if (homeZoneId) this.form.controls.zoneId.setValue(homeZoneId);
        },
        error: () => {
          this.feedbackType.set('info');
          this.feedback.set('Elige una zona para guardarla en tu perfil.');
        },
      });
    }
  }

  onPhotosSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    const invalidFile = files.find(
      (file) => !ALLOWED_PHOTO_TYPES.has(file.type) || file.size > MAX_PHOTO_BYTES,
    );

    if (invalidFile) {
      this.feedbackType.set('error');
      this.feedback.set('Usa imágenes JPEG, PNG o WebP de máximo 10 MB cada una.');
      input.value = '';
      this.selectedPhotos.set([]);
      this.selectedPhotoNames.set([]);
      return;
    }

    this.selectedPhotos.set(files);
    this.selectedPhotoNames.set(files.map((file) => file.name));
    this.feedback.set(files.length ? `${files.length} foto(s) seleccionada(s).` : '');
    this.feedbackType.set('info');
  }

  submit(): void {
    if (this.isSubmitting() || this.published()) return;

    const accessToken = this.authService.getAccessToken();
    if (!accessToken) {
      this.feedbackType.set('error');
      this.feedback.set('Tu sesión expiró. Inicia sesión para continuar.');
      return;
    }

    if (this.createdRequestId()) {
      void this.uploadPendingPhotos(this.createdRequestId()!, accessToken);
      return;
    }

    this.form.markAllAsTouched();

    if (this.form.invalid) {
      this.feedbackType.set('error');
      this.feedback.set('Revisa los campos marcados antes de continuar.');
      return;
    }

    if (this.catalogUnavailable() || this.zonesUnavailable()) {
      this.feedbackType.set('error');
      this.feedback.set('Conecta la API y carga categorías y zonas activas antes de publicar.');
      return;
    }

    this.isSubmitting.set(true);
    this.feedback.set('Publicando tu solicitud…');
    this.feedbackType.set('info');

    void this.createRequest(accessToken);
  }

  startNewRequest(): void {
    const savedZoneId = this.form.controls.zoneId.value;
    this.form.reset({
      categoryId: '',
      zoneId: savedZoneId,
      title: '',
      description: '',
      availableFrom: '',
      availableUntil: '',
    });
    this.selectedPhotos.set([]);
    this.selectedPhotoNames.set([]);
    this.pendingPhotos.set([]);
    this.createdRequestId.set(null);
    this.published.set(false);
    this.feedback.set('');
    this.feedbackType.set('info');
  }

  private async createRequest(accessToken: string): Promise<void> {
    try {
      const values = this.form.getRawValue();
      const created = await firstValueFrom(
        this.requestsApi.createRequest(
          {
            categoryId: values.categoryId,
            zoneId: values.zoneId,
            title: values.title,
            description: values.description,
            availableFrom: values.availableFrom || undefined,
            availableUntil: values.availableUntil || undefined,
          },
          accessToken,
        ),
      );

      this.createdRequestId.set(created.id);
      this.pendingPhotos.set([...this.selectedPhotos()]);
      await this.uploadPendingPhotos(created.id, accessToken);
    } catch (error) {
      this.feedbackType.set('error');
      this.feedback.set(this.apiErrorMessage(error, 'No se pudo publicar la solicitud.'));
    } finally {
      this.isSubmitting.set(false);
    }
  }

  private async uploadPendingPhotos(
    requestId: string,
    accessToken: string,
  ): Promise<void> {
    this.isSubmitting.set(true);
    const photos = [...this.pendingPhotos()];

    try {
      for (let index = 0; index < photos.length; index += 1) {
        await firstValueFrom(
          this.requestsApi.uploadAttachment(requestId, photos[index], accessToken),
        );
        const remainingPhotos = photos.slice(index + 1);
        this.pendingPhotos.set(remainingPhotos);
        this.selectedPhotos.set(remainingPhotos);
        this.selectedPhotoNames.set(remainingPhotos.map((photo) => photo.name));
      }

      this.published.set(true);
      this.feedbackType.set('info');
      this.feedback.set(
        this.selectedPhotoNames().length
          ? 'La solicitud se publicó, pero quedaron fotos pendientes de cargar.'
          : `Solicitud publicada correctamente. Código: ${requestId}`,
      );
    } catch (error) {
      this.feedbackType.set('error');
      this.feedback.set(
        `La solicitud se creó, pero no se pudieron subir todas las fotos. ${this.apiErrorMessage(error, 'Puedes reintentar la carga pendiente.')}`,
      );
    } finally {
      this.isSubmitting.set(false);
    }
  }

  private apiErrorMessage(error: unknown, fallback: string): string {
    if (!(error instanceof HttpErrorResponse)) return fallback;

    const message = error.error?.message;
    if (Array.isArray(message)) return message.join(' ');
    if (typeof message === 'string' && message.trim()) return message;
    if (error.status === 0) return 'No se pudo conectar con la API.';
    if (error.status === 401) return 'Tu sesión expiró. Inicia sesión de nuevo.';
    return fallback;
  }
}

function availabilityRangeValidator(control: AbstractControl): ValidationErrors | null {
  const from = control.get('availableFrom')?.value as string | undefined;
  const until = control.get('availableUntil')?.value as string | undefined;

  if (!from || !until) return null;
  return Date.parse(until) > Date.parse(from) ? null : { invalidAvailabilityRange: true };
}
