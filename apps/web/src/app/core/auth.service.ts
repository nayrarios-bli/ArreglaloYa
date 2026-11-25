
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { API_URL } from './api-url';

export interface RegisterData {
  fullName: string;
  email: string;
  password: string;
  phone?: string;
  role: 'client' | 'worker';
}

export interface LoginData {
  email: string;
  password: string;
}

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  role: 'client' | 'worker' | 'admin' | 'superadmin';
  reviewStatus: 'pending' | 'approved' | 'rejected' | null;
}

export interface AuthSession {
  accessToken: string;
  refreshToken: string;
  expiresAt: number | null;
}

export interface LoginResponse {
  message: string;
  user: AuthUser;
  session: AuthSession;
}

export interface RegisterResponse {
  message: string;
  emailConfirmationRequired: boolean;
  user: AuthUser;
  session: AuthSession | null;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly storageKey = 'arreglaloYaSession';
  private readonly endpoint = `${API_URL}/auth`;

  private readonly sessionSubject =
    new BehaviorSubject<LoginResponse | null>(
      this.getStoredSession(),
    );

  readonly session$ = this.sessionSubject.asObservable();

  constructor(private readonly http: HttpClient) {}

  // REGISTRO
  register(data: RegisterData): Observable<RegisterResponse> {
    return this.http.post<RegisterResponse>(
      `${this.endpoint}/register`,
      data,
    );
  }

  // INICIO DE SESIÓN
  login(data: LoginData): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(
      `${this.endpoint}/login`,
      data,
    );
  }

  // GUARDAR SESIÓN
  saveSession(session: LoginResponse): void {
    sessionStorage.setItem(
      this.storageKey,
      JSON.stringify(session),
    );

    this.sessionSubject.next(session);
  }

  // OBTENER SESIÓN
  getSession(): LoginResponse | null {
    return this.sessionSubject.value;
  }

  // OBTENER USUARIO AUTENTICADO
  getUser(): AuthUser | null {
    return this.getSession()?.user ?? null;
  }

  // OBTENER TOKEN DE ACCESO
  getAccessToken(): string | null {
    return this.getSession()?.session.accessToken ?? null;
  }

  // COMPROBAR AUTENTICACIÓN
  isAuthenticated(): boolean {
    return this.getAccessToken() !== null;
  }

  // ACTUALIZAR ESTADO DE REVISIÓN DEL TRABAJADOR
  updateWorkerReviewStatus(
    reviewStatus: 'pending' | 'approved' | 'rejected',
  ): void {
    const current = this.getSession();

    if (!current || current.user.role !== 'worker') {
      return;
    }

    this.saveSession({
      ...current,
      user: {
        ...current.user,
        reviewStatus,
      },
    });
  }

  // CERRAR SESIÓN
  logout(): void {
    sessionStorage.removeItem(this.storageKey);
    this.sessionSubject.next(null);
  }

  // RECUPERAR SESIÓN AL INICIAR LA APLICACIÓN
  private getStoredSession(): LoginResponse | null {
    try {
      const stored = sessionStorage.getItem(this.storageKey);

      return stored
        ? (JSON.parse(stored) as LoginResponse)
        : null;
    } catch {
      return null;
    }
  }
}
