import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_URL } from '../../core/api-url';

export type PaymentMethod = 'cash' | 'qr';
export type PaymentState = 'not_started' | 'waiting_for_other' | 'waiting_for_me' | 'matched' | 'mismatch';

export interface PaymentRecord {
  service_id: string;
  confirmed_by: string;
  declared_amount: number | string;
  method: PaymentMethod;
  confirmed_at: string;
}

export interface ServicePayment {
  id: string;
  request_id: string;
  status: string;
  final_amount: number | string;
  myConfirmation: PaymentRecord | null;
  otherConfirmation: PaymentRecord | null;
  paymentState: PaymentState;
}

export interface PaymentConfirmationResult {
  serviceId: string;
  myConfirmation: PaymentRecord | null;
  otherConfirmation: PaymentRecord | null;
  paymentState: PaymentState;
  message: string;
}

@Injectable({ providedIn: 'root' })
export class PaymentApiService {
  private readonly http = inject(HttpClient);

  listForUser(accessToken: string): Observable<{ services: ServicePayment[] }> {
    return this.http.get<{ services: ServicePayment[] }>(
      `${API_URL}/services/payment-confirmations`,
      { headers: this.authorization(accessToken) },
    );
  }

  confirm(
    serviceId: string,
    declaredAmount: number,
    method: PaymentMethod,
    accessToken: string,
  ): Observable<PaymentConfirmationResult> {
    return this.http.post<PaymentConfirmationResult>(
      `${API_URL}/services/${serviceId}/payment-confirmations`,
      { declaredAmount, method },
      { headers: this.authorization(accessToken) },
    );
  }

  private authorization(accessToken: string): HttpHeaders {
    return new HttpHeaders({ Authorization: `Bearer ${accessToken}` });
  }
}
