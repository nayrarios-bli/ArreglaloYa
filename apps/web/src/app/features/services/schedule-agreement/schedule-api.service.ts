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

export interface AvailabilityWindow {
  startsAt: string;
  endsAt: string;
}

export interface OccupiedBlock extends AvailabilityWindow {
  id: string;
  status: 'scheduled' | 'in_progress';
}

export interface ScheduleAvailability {
  serviceId: string;
  workerId: string;
  date: string;
  weekday: number;
  timeZone: string;
  availability: AvailabilityWindow[];
  occupied: OccupiedBlock[];
  available: AvailabilityWindow[];
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

  availability(
    serviceId: string,
    date: string,
    accessToken: string,
  ): Observable<ScheduleAvailability> {
    return this.http.get<ScheduleAvailability>(
      `${API_URL}/services/${serviceId}/availability?date=${encodeURIComponent(date)}`,
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
