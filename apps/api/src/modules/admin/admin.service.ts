import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { SupabaseService } from '../../database/supabase.service.js';
import { FilterAdminReportDto } from './admin.dto.js';

@Injectable()
export class AdminService {
  constructor(private readonly supabase: SupabaseService) {}

  async getSystemActivityReport(filters: FilterAdminReportDto) {
    const startDate = filters.startDate ? new Date(filters.startDate).toISOString() : undefined;
    const endDate = filters.endDate ? inclusiveEnd(filters.endDate) : undefined;
    if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
      throw new BadRequestException('La fecha inicial no puede ser posterior a la fecha final.');
    }

    const [users, clients, workers, services, complaints, reviews] = await Promise.all([
      this.countProfiles(undefined, startDate, endDate),
      this.countProfiles('client', startDate, endDate),
      this.countProfiles('worker', startDate, endDate),
      this.countCompletedServices(startDate, endDate),
      this.countOpenComplaints(startDate, endDate),
      this.averageReviewScore(startDate, endDate),
    ]);

    return {
      generatedAt: new Date().toISOString(),
      filtersApplied: { startDate: filters.startDate ?? null, endDate: filters.endDate ?? null },
      metrics: {
        totalUsers: users,
        clients,
        workers,
        completedServices: services,
        pendingComplaints: complaints,
        averageRating: reviews,
      },
    };
  }

  private async countProfiles(role: 'client' | 'worker' | undefined, startDate?: string, endDate?: string) {
    let query = this.supabase.admin.from('profiles').select('id', { count: 'exact', head: true });
    if (role) query = query.eq('role', role);
    if (startDate) query = query.gte('created_at', startDate);
    if (endDate) query = query.lte('created_at', endDate);
    const { count, error } = await query;
    if (error) throw new InternalServerErrorException('No se pudieron contar los usuarios.');
    return count ?? 0;
  }

  private async countCompletedServices(startDate?: string, endDate?: string) {
    let query = this.supabase.admin
      .from('services')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'completed');
    if (startDate) query = query.gte('completed_at', startDate);
    if (endDate) query = query.lte('completed_at', endDate);
    const { count, error } = await query;
    if (error) throw new InternalServerErrorException('No se pudieron contar los servicios finalizados.');
    return count ?? 0;
  }

  private async countOpenComplaints(startDate?: string, endDate?: string) {
    let query = this.supabase.admin
      .from('complaints')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'open');
    if (startDate) query = query.gte('created_at', startDate);
    if (endDate) query = query.lte('created_at', endDate);
    const { count, error } = await query;
    if (error) throw new InternalServerErrorException('No se pudieron contar los reclamos pendientes.');
    return count ?? 0;
  }

  private async averageReviewScore(startDate?: string, endDate?: string): Promise<number | null> {
    let total = 0;
    let count = 0;
    const pageSize = 1000;

    for (let offset = 0; ; offset += pageSize) {
      let query = this.supabase.admin
        .from('reviews')
        .select('score')
        .order('id')
        .range(offset, offset + pageSize - 1);
      if (startDate) query = query.gte('created_at', startDate);
      if (endDate) query = query.lte('created_at', endDate);
      const { data, error } = await query;
      if (error) throw new InternalServerErrorException('No se pudieron consultar las calificaciones.');
      for (const review of data ?? []) {
        total += Number(review.score);
        count += 1;
      }
      if (!data || data.length < pageSize) break;
    }

    if (count === 0) return null;
    return Math.round((total / count) * 100) / 100;
  }
}

function inclusiveEnd(value: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return `${value}T23:59:59.999Z`;
  return new Date(value).toISOString();
}
