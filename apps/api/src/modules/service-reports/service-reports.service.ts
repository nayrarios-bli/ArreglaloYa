import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseService } from '../../database/supabase.service.js';
import { ServiceReportQueryDto } from './dto/service-report-query.dto.js';
import { listDays, resolveRange, toBoliviaDay } from './report-range.js';

const TOP_CATEGORIES_LIMIT = 10;
const HISTORY_LIMIT = 5;

interface CategoryCounts {
  requests: number;
  completed: number;
  cancelled: number;
}

@Injectable()
export class ServiceReportsService {
  constructor(private readonly supabase: SupabaseService) {}

  async generate(adminId: string, query: ServiceReportQueryDto) {
    // 1. Validar el período (reglas de negocio en el backend).
    const range = resolveRange(query.startDate, query.endDate);
    const categoryId = query.categoryId ?? null;
    const db = this.supabase.admin;

    // 2. Validar la categoría y obtener los nombres de todas.
    const { data: categories, error: categoriesError } = await db
      .from('categories')
      .select('id, name');
    if (categoriesError) {
      throw new InternalServerErrorException('No se pudieron consultar las categorías.');
    }
    const categoryNames: Map<string, string> = new Map(
      (categories ?? []).map((category) => [category.id, category.name]),
    );
    if (categoryId && !categoryNames.has(categoryId)) {
      throw new NotFoundException('La categoría seleccionada no existe.');
    }

    // 3. Consultar en paralelo los datos reales del período.
    let requestsQuery = db
      .from('repair_requests')
      .select('id, category_id')
      .neq('status', 'draft')
      .gte('created_at', range.startIso)
      .lte('created_at', range.endIso);
    if (categoryId) requestsQuery = requestsQuery.eq('category_id', categoryId);

    const [requestsResult, completedResult, cancellationsResult] = await Promise.all([
      requestsQuery,
      db
        .from('services')
        .select('id, request_id, completed_at')
        .eq('status', 'completed')
        .gte('completed_at', range.startIso)
        .lte('completed_at', range.endIso),
      db
        .from('service_cancellations')
        .select('service_id, created_at')
        .gte('created_at', range.startIso)
        .lte('created_at', range.endIso),
    ]);
    if (requestsResult.error || completedResult.error || cancellationsResult.error) {
      throw new InternalServerErrorException('No se pudo generar el reporte.');
    }

    const requests = requestsResult.data ?? [];
    const completed = completedResult.data ?? [];
    const cancellations = cancellationsResult.data ?? [];

    // 4. Averiguar la categoría de cada servicio (servicio → solicitud → categoría).
    const serviceToRequest = new Map<string, string>();
    for (const service of completed) serviceToRequest.set(service.id, service.request_id);

    const cancelledIds = cancellations.map((cancellation) => cancellation.service_id);
    if (cancelledIds.length) {
      const { data, error } = await db
        .from('services')
        .select('id, request_id')
        .in('id', cancelledIds);
      if (error) {
        throw new InternalServerErrorException('No se pudieron consultar los servicios cancelados.');
      }
      for (const service of data ?? []) serviceToRequest.set(service.id, service.request_id);
    }

    const requestIds = [...new Set(serviceToRequest.values())];
    const requestToCategory = new Map<string, string>();
    if (requestIds.length) {
      const { data, error } = await db
        .from('repair_requests')
        .select('id, category_id')
        .in('id', requestIds);
      if (error) {
        throw new InternalServerErrorException('No se pudieron consultar las solicitudes.');
      }
      for (const request of data ?? []) requestToCategory.set(request.id, request.category_id);
    }

    const categoryOfService = (serviceId: string): string | null =>
      requestToCategory.get(serviceToRequest.get(serviceId) ?? '') ?? null;

    // Si hay filtro de categoría, quedarse solo con sus servicios.
    const completedRows = completed.filter(
      (service) => !categoryId || categoryOfService(service.id) === categoryId,
    );
    const cancelledRows = cancellations.filter(
      (cancellation) => !categoryId || categoryOfService(cancellation.service_id) === categoryId,
    );

    // 5. Ranking de categorías más solicitadas.
    const counts = new Map<string, CategoryCounts>();
    const add = (id: string | null, field: keyof CategoryCounts) => {
      if (!id) return;
      const current = counts.get(id) ?? { requests: 0, completed: 0, cancelled: 0 };
      current[field] += 1;
      counts.set(id, current);
    };
    for (const request of requests) add(request.category_id, 'requests');
    for (const service of completedRows) add(categoryOfService(service.id), 'completed');
    for (const cancellation of cancelledRows) {
      add(categoryOfService(cancellation.service_id), 'cancelled');
    }

    const topCategories = [...counts.entries()]
      .map(([id, value]) => ({
        categoryId: id,
        name: categoryNames.get(id) ?? 'Sin categoría',
        ...value,
      }))
      .sort(
        (a, b) =>
          b.requests - a.requests ||
          b.completed - a.completed ||
          a.name.localeCompare(b.name, 'es'),
      )
      .slice(0, TOP_CATEGORIES_LIMIT);

    // 6. Evolución diaria de servicios atendidos y cancelados.
    const timeline = listDays(range).map((date) => ({ date, completed: 0, cancelled: 0 }));
    const dayIndex = new Map<string, number>();
    timeline.forEach((point, index) => dayIndex.set(point.date, index));
    for (const service of completedRows) {
      const index = dayIndex.get(toBoliviaDay(service.completed_at));
      if (index !== undefined) timeline[index].completed += 1;
    }
    for (const cancellation of cancelledRows) {
      const index = dayIndex.get(toBoliviaDay(cancellation.created_at));
      if (index !== undefined) timeline[index].cancelled += 1;
    }

    const finished = completedRows.length + cancelledRows.length;
    const summary = {
      totalRequests: requests.length,
      completedServices: completedRows.length,
      cancelledServices: cancelledRows.length,
      cancellationRate: finished
        ? Math.round((cancelledRows.length / finished) * 1000) / 10
        : 0,
    };

    // 7. Guardar el reporte generado en la base de datos.
    const { data: saved, error: saveError } = await db
      .from('service_report_queries')
      .insert({
        admin_id: adminId,
        start_date: range.startDate,
        end_date: range.endDate,
        category_id: categoryId,
        total_requests: summary.totalRequests,
        completed_services: summary.completedServices,
        cancelled_services: summary.cancelledServices,
      })
      .select('id, created_at')
      .single();
    if (saveError || !saved) {
      throw new InternalServerErrorException('No se pudo guardar el reporte.');
    }

    return {
      reportId: saved.id,
      generatedAt: saved.created_at,
      filters: {
        startDate: range.startDate,
        endDate: range.endDate,
        categoryId,
        categoryName: categoryId ? categoryNames.get(categoryId) ?? null : null,
      },
      summary,
      topCategories,
      timeline,
    };
  }

  // Últimos reportes generados por este administrador.
  async history(adminId: string) {
    const { data, error } = await this.supabase.admin
      .from('service_report_queries')
      .select(
        'id, start_date, end_date, category_id, total_requests, completed_services, cancelled_services, created_at, category:categories(name)',
      )
      .eq('admin_id', adminId)
      .order('created_at', { ascending: false })
      .limit(HISTORY_LIMIT);
    if (error) {
      throw new InternalServerErrorException('No se pudo consultar el historial de reportes.');
    }

    return (data ?? []).map((row) => {
      const category = Array.isArray(row.category) ? row.category[0] : row.category;
      return {
        id: row.id,
        startDate: row.start_date,
        endDate: row.end_date,
        categoryId: row.category_id,
        categoryName: category?.name ?? null,
        totalRequests: row.total_requests,
        completedServices: row.completed_services,
        cancelledServices: row.cancelled_services,
        createdAt: row.created_at,
      };
    });
  }
}
