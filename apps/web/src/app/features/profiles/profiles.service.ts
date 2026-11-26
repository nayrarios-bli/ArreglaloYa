
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, throwError } from 'rxjs';

import { API_URL } from '../../core/api-url';
import { AuthService } from '../../core/auth.service';

export interface ProfileZone {
  name: string;
  city: string;
}

export interface ProfileSpecialty {
  id: string;
  name: string;
}

export interface ProfileServiceZone {
  id: string;
  name: string;
  city: string;
}

export interface ProfileAvailability {
  weekday: number;
  startsAt: string;
  endsAt: string;
}

export interface ProfileReview {
  score: number;
  comment: string | null;
  createdAt: string;
}

export interface PublicProfile {
  id: string;
  fullName: string;
  role: string;
  bio?: string | null;
  zone?: ProfileZone | null;
  specialties?: ProfileSpecialty[];
  serviceZones?: ProfileServiceZone[];
  availability?: ProfileAvailability[];
  averageRating?: number | null;
  reviewCount?: number;
  reviews?: ProfileReview[];
}

export interface PrivateAddress {
  exactAddress: string | null;
}

export interface UpdateProfilePayload {
  fullName?: string;
  phone?: string;
  exactAddress?: string;
  homeZoneId?: string;
  bio?: string;
}

@Injectable({ providedIn: 'root' })
export class ProfilesService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);

  getPublicProfile(id: string): Observable<PublicProfile> {
    return this.http.get<PublicProfile>(
      `${API_URL}/profiles/${encodeURIComponent(id)}`,
    );
  }

  getMyPrivateAddress(): Observable<PrivateAddress> {
    const headers = this.authHeaders();

    if (!headers) {
      return throwError(() => new Error('No hay una sesión activa.'));
    }

    return this.http.get<PrivateAddress>(
      `${API_URL}/profiles/me/private-address`,
      { headers },
    );
  }

  getClientPrivateAddress(clientId: string): Observable<PrivateAddress> {
    const headers = this.authHeaders();

    if (!headers) {
      return throwError(() => new Error('No hay una sesión activa.'));
    }

    return this.http.get<PrivateAddress>(
      `${API_URL}/profiles/clients/${encodeURIComponent(clientId)}/private-address`,
      { headers },
    );
  }

  updateMyProfile(payload: UpdateProfilePayload): Observable<PublicProfile> {
    const headers = this.authHeaders();

    if (!headers) {
      return throwError(() => new Error('No hay una sesión activa.'));
    }

    return this.http.put<PublicProfile>(
      `${API_URL}/profiles/me`,
      payload,
      { headers },
    );
  }

  private authHeaders(): HttpHeaders | null {
    const token = this.authService.getAccessToken();

    if (!token) {
      return null;
    }

    return new HttpHeaders({
      Authorization: `Bearer ${token}`,
    });
  }
}
