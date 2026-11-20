
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';

import { AuthService } from '../../core/auth.service';

const API_URL = 'http://localhost:3000/client';

// Datos del perfil del cliente
export interface ClientProfile {
  id: string;
  fullName: string;
  phone: string | null;
  role: 'client';
  homeZoneId: string | null;
}

// Información de las zonas disponibles
export interface ServiceZone {
  id: string;
  name: string;
  city: string;
}

// Datos que se pueden actualizar
export interface UpdateClientProfileData {
  fullName?: string;
  phone?: string;
  homeZoneId?: string;
}

@Injectable({
  providedIn: 'root',
})
export class ClientProfileService {
  constructor(
    private readonly http: HttpClient,
    private readonly authService: AuthService,
  ) {}

  // CONSULTAR PERFIL DEL CLIENTE
  getProfile(): Observable<ClientProfile> {
    const token = this.authService.getAccessToken();

    if (!token) {
      return throwError(
        () => new Error('No existe una sesión autenticada.'),
      );
    }

    return this.http.get<ClientProfile>(
      `${API_URL}/profile`,
      {
        headers: new HttpHeaders({
          Authorization: `Bearer ${token}`,
        }),
      },
    );
  }

  // CONSULTAR ZONAS ACTIVAS
  getZones(): Observable<ServiceZone[]> {
    const token = this.authService.getAccessToken();

    if (!token) {
      return throwError(
        () => new Error('No existe una sesión autenticada.'),
      );
    }

    return this.http.get<ServiceZone[]>(
      `${API_URL}/zones`,
      {
        headers: new HttpHeaders({
          Authorization: `Bearer ${token}`,
        }),
      },
    );
  }

  // ACTUALIZAR PERFIL DEL CLIENTE
  updateProfile(
    data: UpdateClientProfileData,
  ): Observable<ClientProfile> {
    const token = this.authService.getAccessToken();

    if (!token) {
      return throwError(
        () => new Error('No existe una sesión autenticada.'),
      );
    }

    return this.http.patch<ClientProfile>(
      `${API_URL}/profile`,
      data,
      {
        headers: new HttpHeaders({
          Authorization: `Bearer ${token}`,
        }),
      },
    );
  }
}
