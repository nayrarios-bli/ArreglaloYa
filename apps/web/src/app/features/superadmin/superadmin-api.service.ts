
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { API_URL } from '../../core/api-url.js';

// =====================================================
// INTERFACES
// =====================================================

export interface Admin {
  id: string;
  email: string;
  full_name: string;
  phone: string | null;
  role: 'admin';
  created_at?: string;
  isActive: boolean;
}

export interface CreatedAdmin {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  role: 'admin';
}

export interface CreateAdminPayload {
  fullName: string;
  email: string;
  password: string;
  phone?: string;
}

export interface UpdateAdminPayload {
  fullName?: string;
  email?: string;
  password?: string;
  phone?: string;
}

export interface AdminResponse {
  message: string;
  admin: Admin | CreatedAdmin;
}

export interface AdminActionResponse {
  message: string;
}

// =====================================================
// SUPERADMIN API SERVICE
// =====================================================

@Injectable({
  providedIn: 'root',
})
export class SuperadminApiService {
  private readonly http = inject(HttpClient);
  private readonly endpoint = `${API_URL}/superadmin/admins`;

  private headers(token: string): HttpHeaders {
    return new HttpHeaders({
      Authorization: `Bearer ${token}`,
    });
  }

  // LISTAR ADMINISTRADORES
  getAdmins(token: string): Observable<Admin[]> {
    return this.http.get<Admin[]>(this.endpoint, {
      headers: this.headers(token),
    });
  }

  // CONSULTAR ADMINISTRADOR POR ID
  getAdminById(id: string, token: string): Observable<Admin> {
    return this.http.get<Admin>(`${this.endpoint}/${id}`, {
      headers: this.headers(token),
    });
  }

  // CREAR ADMINISTRADOR
  createAdmin(
    payload: CreateAdminPayload,
    token: string,
  ): Observable<AdminResponse> {
    return this.http.post<AdminResponse>(
      this.endpoint,
      payload,
      { headers: this.headers(token) },
    );
  }

  // ACTUALIZAR ADMINISTRADOR
  updateAdmin(
    id: string,
    payload: UpdateAdminPayload,
    token: string,
  ): Observable<AdminResponse> {
    return this.http.patch<AdminResponse>(
      `${this.endpoint}/${id}`,
      payload,
      { headers: this.headers(token) },
    );
  }

  // DESACTIVAR ADMINISTRADOR
  deactivateAdmin(
    id: string,
    token: string,
  ): Observable<AdminActionResponse> {
    return this.http.patch<AdminActionResponse>(
      `${this.endpoint}/${id}/deactivate`,
      {},
      { headers: this.headers(token) },
    );
  }

  // REACTIVAR ADMINISTRADOR
  activateAdmin(
    id: string,
    token: string,
  ): Observable<AdminActionResponse> {
    return this.http.patch<AdminActionResponse>(
      `${this.endpoint}/${id}/activate`,
      {},
      { headers: this.headers(token) },
    );
  }
}
