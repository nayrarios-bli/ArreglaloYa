import type { Request } from 'express';
import type { AuthenticatedUser } from '../supabase/supabase.service.js';

export type AuthenticatedRequest = Request & { user: AuthenticatedUser };
