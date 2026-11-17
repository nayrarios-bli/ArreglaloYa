import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_URL } from '../../core/api-url';

export interface ScheduledService {
  id: string;
  request_id: string;
  status: 'scheduled';
  scheduled_start: string | null;
  scheduled_end: string | null;
}

@Injectable({ providedIn: 'root' })
export class ScheduleApiService {
  private readonly http = inject(HttpClient);

  listForScheduling(accessToken: string): Observable<{ services: ScheduledService[] }> {
    return this.http.get<{ services: ScheduledService[] }>(
      `${API_URL}/services/scheduling`,
      { headers: this.authorization(accessToken) },
    );
  }

  updateSchedule(
    serviceId: string,
    startsAt: string,
    endsAt: string,
    accessToken: string,
  ): Observable<ScheduledService> {
    return this.http.patch<ScheduledService>(
      `${API_URL}/services/${serviceId}/schedule`,
      { startsAt, endsAt },
      { headers: this.authorization(accessToken) },
    );
  }

  private authorization(accessToken: string): HttpHeaders {
    return new HttpHeaders({ Authorization: `Bearer ${accessToken}` });
  }
}
