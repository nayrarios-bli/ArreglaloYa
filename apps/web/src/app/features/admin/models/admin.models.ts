
export interface AdminWorker {
  user_id: string;
  bio: string | null;
  review_status: 'pending' | 'approved' | 'rejected';
  submitted_at: string;
  fullName: string | null;
  phone: string | null;
  categories: AdminCategory[];
  zones: AdminZone[];
  availability: AdminAvailability[];
}

export interface AdminCategory {
  id: string;
  name: string;
}

export interface AdminZone {
  id: string;
  name: string;
  city: string;
}

export interface AdminAvailability {
  id: string;
  worker_id: string;
  weekday: number;
  starts_at: string;
  ends_at: string;
}

export interface ReviewWorkerPayload {
  decision: 'approved' | 'rejected';
  notes?: string;
}

export interface ReviewWorkerResponse {
  message: string;
  reviewStatus: 'approved' | 'rejected';
}
