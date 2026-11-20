import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { OfferDraft } from './offer-form.component';

export interface CreatedOffer {
  id: string;
  request_id: string;
  worker_id: string;
  estimated_amount: number;
  requires_visit: boolean;
  message: string | null;
  status: string;
  created_at: string;
}

@Injectable({ providedIn: 'root' })
export class OffersApiService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = 'http://localhost:3000';

  createOffer(
    requestId: string,
    accessToken: string,
    offer: OfferDraft,
  ): Observable<CreatedOffer> {
    const headers = new HttpHeaders({
      Authorization: `Bearer ${accessToken}`,
    });

    const body = {
      estimatedAmount: offer.estimatedAmount,
      requiresVisit: offer.requiresVisit,
      ...(offer.message.trim()
        ? { message: offer.message.trim() }
        : {}),
    };

    return this.http.post<CreatedOffer>(
      `${this.apiUrl}/requests/${encodeURIComponent(requestId)}/offers`,
      body,
      { headers },
    );
  }
}