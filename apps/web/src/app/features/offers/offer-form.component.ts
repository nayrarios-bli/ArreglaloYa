import {
  Component,
  EventEmitter,
  Input,
  Output,
  inject,
} from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import {
  CreatedOffer,
  OffersApiService,
} from './offers-api.service';

export interface OfferDraft {
  estimatedAmount: number;
  requiresVisit: boolean;
  message: string;
}

@Component({
  selector: 'app-offer-form',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './offer-form.component.html',
  styleUrl: './offer-form.component.css',
})
export class OfferFormComponent {
  @Input({ required: true }) requestId!: string;
  @Input({ required: true }) accessToken!: string;
  @Output() offerReady = new EventEmitter<CreatedOffer>();

  private readonly offersApi = inject(OffersApiService);

  isSubmitting = false;
  submitError = '';
  submitSuccess = '';

  readonly offerForm = new FormGroup({
    estimatedAmount: new FormControl<number | null>(null, [
      Validators.required,
      Validators.min(0),
    ]),
    requiresVisit: new FormControl<boolean | null>(null, [
      Validators.required,
    ]),
    message: new FormControl('', { nonNullable: true }),
  });

  submit(): void {
    this.submitError = '';
    this.submitSuccess = '';

    if (this.offerForm.invalid) {
      this.offerForm.markAllAsTouched();
      return;
    }

    if (!this.requestId || !this.accessToken) {
      this.submitError =
        'Falta la solicitud o la sesión del trabajador.';
      return;
    }

    const { estimatedAmount, requiresVisit, message } =
      this.offerForm.getRawValue();

    if (estimatedAmount === null || requiresVisit === null) {
      return;
    }

    this.isSubmitting = true;

    this.offersApi
      .createOffer(this.requestId, this.accessToken, {
        estimatedAmount,
        requiresVisit,
        message,
      })
      .subscribe({
        next: (createdOffer) => {
          this.isSubmitting = false;
          this.submitSuccess = 'La oferta se presentó correctamente.';
          this.offerReady.emit(createdOffer);
          this.offerForm.reset({
            estimatedAmount: null,
            requiresVisit: null,
            message: '',
          });
        },
        error: (error: HttpErrorResponse) => {
          this.isSubmitting = false;
          this.submitError =
            typeof error.error?.message === 'string'
              ? error.error.message
              : 'No se pudo enviar la oferta. Inténtalo de nuevo.';
        },
      });
  }
}