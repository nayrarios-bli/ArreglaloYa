import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_URL } from '../../../../core/api-url';

export interface CompatibleRequest {
  id: string;
  title: string;
  description: string;
  category_id: string;
  zone_id: string;
  available_from: string | null;
  available_until: string | null;
  created_at: string;
  expires_at: string;
  category: { id: string; name: string } | null;
  zone: { id: string; name: string; city: string } | null;
}

export interface CompatibleRequestDetail extends CompatibleRequest {
  attachments: { id: string; uploaded_at: string; signed_url: string }[];
}

@Injectable({ providedIn: 'root' })
export class CompatibleRequestsApiService {
  private readonly http = inject(HttpClient);

  list(accessToken: string): Observable<{ profileReady: boolean; requests: CompatibleRequest[] }> {
    return this.http.get<{ profileReady: boolean; requests: CompatibleRequest[] }>(
      `${API_URL}/requests/compatible`,
      { headers: this.authorization(accessToken) },
    );
  }

  getDetail(requestId: string, accessToken: string): Observable<CompatibleRequestDetail> {
    return this.http.get<CompatibleRequestDetail>(
      `${API_URL}/requests/compatible/${requestId}`,
      { headers: this.authorization(accessToken) },
    );
  }

  private authorization(accessToken: string): HttpHeaders {
    return new HttpHeaders({ Authorization: `Bearer ${accessToken}` });
  }
}
