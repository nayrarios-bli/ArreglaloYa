import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CatalogApiService, type CatalogCategory } from '../core/catalog-api.service.js';

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

  readonly categories = signal<CatalogCategory[]>([]);
  readonly catalogUnavailable = signal(false);
  readonly selectedPhotos = signal<File[]>([]);
  readonly selectedPhotoNames = signal<string[]>([]);
  readonly feedback = signal('');
  readonly feedbackType = signal<'info' | 'error'>('info');

  readonly form = this.formBuilder.nonNullable.group(
    {
      categoryId: ['', Validators.required],
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
    this.feedback.set(files.length
      ? 'Fotos seleccionadas. Se subirán después de guardar la solicitud y validar tu sesión.'
      : '');
    this.feedbackType.set('info');
  }

  submit(): void {
    this.form.markAllAsTouched();

    if (this.form.invalid) {
      this.feedbackType.set('error');
      this.feedback.set('Revisa los campos marcados antes de continuar.');
      return;
    }

    if (this.catalogUnavailable()) {
      this.feedbackType.set('error');
      this.feedback.set('Conecta la API y carga el catálogo real antes de publicar.');
      return;
    }

    if (this.selectedPhotoNames().length) {
      this.feedbackType.set('info');
      this.feedback.set('La carga se habilitará al integrar tu sesión y la publicación de la solicitud (HU-F16).');
      return;
    }

    this.feedbackType.set('info');
    this.feedback.set(
      'El formulario está listo. Para guardar la solicitud hace falta iniciar sesión como cliente (HU-F16). Aún no se envió.',
    );
  }
}

function availabilityRangeValidator(control: AbstractControl): ValidationErrors | null {
  const from = control.get('availableFrom')?.value as string | undefined;
  const until = control.get('availableUntil')?.value as string | undefined;

  if (!from || !until) return null;
  return Date.parse(until) > Date.parse(from) ? null : { invalidAvailabilityRange: true };
}
