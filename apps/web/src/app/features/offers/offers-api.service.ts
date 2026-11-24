import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_URL } from '../../core/api-url.js';
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

export interface RequestOffer {
  id: string;
  request_id: string;
  worker_id: string;
  estimated_amount: number | null;
  requires_visit: boolean;
  message: string | null;
  status: string;
  created_at: string;
}

export interface PublicWorkerProfile {
  id: string;
  fullName: string;
  bio: string | null;
  specialties: { id: string; name: string }[];
  serviceZones: { id: string; name: string; city: string }[];
}

export interface SelectedOffer {
  offer_id: string;
  service_id: string;
  final_amount: number | null;
  requires_visit: boolean;
}

@Injectable({ providedIn: 'root' })
export class OffersApiService {
  private readonly http = inject(HttpClient);

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
      `${API_URL}/requests/${encodeURIComponent(requestId)}/offers`,
      body,
      { headers },
    );
  }
  getOffersForRequest(
  requestId: string,
  accessToken: string,
): Observable<RequestOffer[]> {
  const headers = new HttpHeaders({
    Authorization: `Bearer ${accessToken}`,
  });

  return this.http.get<RequestOffer[]>(
    `${API_URL}/requests/${encodeURIComponent(requestId)}/offers`,
    { headers },
  );
}

selectOffer(
  requestId: string,
  offerId: string,
  accessToken: string,
): Observable<SelectedOffer> {
  const headers = new HttpHeaders({
    Authorization: `Bearer ${accessToken}`,
  });

  return this.http.post<SelectedOffer>(
    `${API_URL}/requests/${encodeURIComponent(requestId)}/offers/${encodeURIComponent(offerId)}/select`,
    {},
    { headers },
  );
}

getWorkerProfileForOffer(
  requestId: string,
  offerId: string,
  accessToken: string,
): Observable<PublicWorkerProfile> {
  const headers = new HttpHeaders({
    Authorization: `Bearer ${accessToken}`,
  });

  return this.http.get<PublicWorkerProfile>(
    `${API_URL}/requests/${encodeURIComponent(requestId)}/offers/${encodeURIComponent(offerId)}/worker-profile`,
    { headers },
  );
}
}
