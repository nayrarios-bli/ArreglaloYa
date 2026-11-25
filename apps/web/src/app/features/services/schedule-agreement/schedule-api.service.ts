import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_URL } from '../../../core/api-url';

export interface ScheduledService {
  id: string;
  request_id: string;
  title: string;
  status: 'scheduled';
  scheduled_start: string | null;
  scheduled_end: string | null;
}

export interface ScheduleUpdate {
  id: string;
  request_id: string;
  status: 'scheduled';
  scheduled_start: string;
  scheduled_end: string;
}

@Injectable({ providedIn: 'root' })
export class ScheduleApiService {
  private readonly http = inject(HttpClient);

  list(accessToken: string): Observable<{ services: ScheduledService[] }> {
    return this.http.get<{ services: ScheduledService[] }>(
      `${API_URL}/services/scheduling`,
      { headers: this.authorization(accessToken) },
    );
  }

  save(serviceId: string, startsAt: string, endsAt: string, accessToken: string): Observable<ScheduleUpdate> {
    return this.http.patch<ScheduleUpdate>(
      `${API_URL}/services/${serviceId}/schedule`,
      { startsAt, endsAt },
      { headers: this.authorization(accessToken) },
    );
  }

  private authorization(accessToken: string): HttpHeaders {
    return new HttpHeaders({ Authorization: `Bearer ${accessToken}` });
  }
}
