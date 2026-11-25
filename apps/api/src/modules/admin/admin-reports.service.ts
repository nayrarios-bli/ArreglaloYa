import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { SupabaseService } from '../../database/supabase.service.js';
import { FilterAdminReportDto } from './admin.dto.js';

@Injectable()
export class AdminReportsService {
  constructor(private readonly supabase: SupabaseService) {}

  async getSystemActivityReport(filters: FilterAdminReportDto) {
    const startDate = filters.startDate
      ? normalizeDate(filters.startDate, false)
      : undefined;
    const endDate = filters.endDate
      ? normalizeDate(filters.endDate, true)
      : undefined;

    if (startDate && endDate && startDate > endDate) {
      throw new BadRequestException(
        'La fecha inicial no puede ser posterior a la fecha final.',
      );
    }

    const [users, clients, workers, services, complaints, reviews] =
      await Promise.all([
        this.countProfiles(undefined, startDate, endDate),
        this.countProfiles('client', startDate, endDate),
        this.countProfiles('worker', startDate, endDate),
        this.countCompletedServices(startDate, endDate),
        this.countOpenComplaints(startDate, endDate),
        this.averageReviewScore(startDate, endDate),
      ]);

    return {
      generatedAt: new Date().toISOString(),
      filtersApplied: {
        startDate: filters.startDate ?? null,
        endDate: filters.endDate ?? null,
      },
      metrics: {
        totalUsers: users,
        activeClients: clients,
        activeWorkers: workers,
        completedServices: services,
        pendingComplaints: complaints,
        averageRating: reviews,
      },
    };
  }

  private async countProfiles(
    role: 'client' | 'worker' | undefined,
    startDate?: string,
    endDate?: string,
  ) {
    let query = this.supabase.admin
      .from('profiles')
      .select('id', { count: 'exact', head: true });
    if (role) query = query.eq('role', role);
    if (startDate) query = query.gte('created_at', startDate);
    if (endDate) query = query.lte('created_at', endDate);

    const { count, error } = await query;
    if (error) {
      throw new InternalServerErrorException(
        'No se pudieron contar los usuarios.',
      );
    }
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
    if (error) {
      throw new InternalServerErrorException(
        'No se pudieron contar los servicios finalizados.',
      );
    }
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
    if (error) {
      throw new InternalServerErrorException(
        'No se pudieron contar los reclamos pendientes.',
      );
    }
    return count ?? 0;
  }

  private async averageReviewScore(
    startDate?: string,
    endDate?: string,
  ): Promise<number | null> {
    let query = this.supabase.admin.from('reviews').select('score');
    if (startDate) query = query.gte('created_at', startDate);
    if (endDate) query = query.lte('created_at', endDate);

    const { data, error } = await query;
    if (error) {
      throw new InternalServerErrorException(
        'No se pudieron consultar las calificaciones.',
      );
    }
    if (!data?.length) return null;

    const average =
      data.reduce((sum, review) => sum + Number(review.score), 0) /
      data.length;
    return Math.round(average * 100) / 100;
  }
}

function normalizeDate(value: string, isEndDate: boolean): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return `${value}T${isEndDate ? '23:59:59.999' : '00:00:00.000'}Z`;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new BadRequestException('El rango de fechas no es válido.');
  }
  return parsed.toISOString();
}
