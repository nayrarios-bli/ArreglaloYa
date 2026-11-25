
import {
  BadRequestException,
  Injectable,
  ConflictException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';

import { SupabaseService } from '../../database/supabase.service.js';
import { ReviewWorkerDto } from './dto/review-worker.dto.js';

@Injectable()
export class AdminService {
  constructor(private readonly supabase: SupabaseService) {}

  private pendingWorkers() {
    return this.supabase.admin.from('worker_profiles')
      .select('user_id, bio, review_status, submitted_at')
      .eq('review_status', 'pending')
      .not('submitted_at', 'is', null);
  }

  async getPendingWorkerCount() {
    const { count, error } = await this.supabase.admin.from('worker_profiles')
      .select('user_id', { count: 'exact', head: true })
      .eq('review_status', 'pending')
      .not('submitted_at', 'is', null);
    if (error) {
      throw new InternalServerErrorException('No se pudieron contar los perfiles pendientes.');
    }
    return { count: count ?? 0 };
  }

  // CONSULTAR TRABAJADORES PENDIENTES
  async getPendingWorkers() {
    const client = this.supabase.admin;

    const { data: workers, error } = await this.pendingWorkers()
      .order('submitted_at', { ascending: true });

    if (error) {
      throw new InternalServerErrorException(
        'No se pudieron consultar los trabajadores pendientes.',
      );
    }

    if (!workers?.length) {
      return [];
    }

    const workerIds = workers.map((worker) => worker.user_id);

    const [
      profiles,
      workerCategories,
      workerZones,
      availability,
      documents,
    ] = await Promise.all([
      client
        .from('profiles')
        .select('id, full_name, phone')
        .in('id', workerIds),

      client
        .from('worker_categories')
        .select('worker_id, category_id')
        .in('worker_id', workerIds),

      client
        .from('worker_zones')
        .select('worker_id, zone_id')
        .in('worker_id', workerIds),

      client
        .from('worker_availability')
        .select('id, worker_id, weekday, starts_at, ends_at')
        .in('worker_id', workerIds)
        .order('weekday'),

      client
        .from('worker_documents')
        .select('worker_id, document_type, storage_path, uploaded_at')
        .in('worker_id', workerIds),
    ]);

    if (
      profiles.error ||
      workerCategories.error ||
      workerZones.error ||
      availability.error ||
      documents.error
    ) {
      throw new InternalServerErrorException(
        'No se pudo consultar toda la información de los trabajadores.',
      );
    }

    const categoryIds = [
      ...new Set(
        workerCategories.data?.map((item) => item.category_id) ?? [],
      ),
    ];

    const zoneIds = [
      ...new Set(
        workerZones.data?.map((item) => item.zone_id) ?? [],
      ),
    ];

    const [categories, zones] = await Promise.all([
      categoryIds.length
        ? client
            .from('categories')
            .select('id, name')
            .in('id', categoryIds)
        : Promise.resolve({ data: [], error: null }),

      zoneIds.length
        ? client
            .from('service_zones')
            .select('id, name, city')
            .in('id', zoneIds)
        : Promise.resolve({ data: [], error: null }),
    ]);

    if (categories.error || zones.error) {
      throw new InternalServerErrorException(
        'No se pudieron consultar las especialidades o zonas.',
      );
    }

    const bucketName = process.env.SUPABASE_WORKER_DOCUMENTS_BUCKET ?? 'worker-documents';
    const storage = client.storage.from(bucketName);
    const documentRows = documents.data ?? [];
    const signed = documentRows.length
      ? await storage.createSignedUrls(documentRows.map((row) => row.storage_path), 600)
      : null;
    const signedByPath = new Map(
      (signed?.data ?? []).map((item) => [item.path, item.signedUrl]),
    );

    return workers.map((worker) => {
      const profile = profiles.data?.find(
        (item) => item.id === worker.user_id,
      );

      return {
        ...worker,
        fullName: profile?.full_name ?? null,
        phone: profile?.phone ?? null,

        categories: (workerCategories.data ?? [])
          .filter((item) => item.worker_id === worker.user_id)
          .map((item) =>
            categories.data?.find(
              (category) => category.id === item.category_id,
            ),
          )
          .filter(Boolean),

        zones: (workerZones.data ?? [])
          .filter((item) => item.worker_id === worker.user_id)
          .map((item) =>
            zones.data?.find(
              (zone) => zone.id === item.zone_id,
            ),
          )
          .filter(Boolean),

        availability: (availability.data ?? []).filter(
          (item) => item.worker_id === worker.user_id,
        ),
        documents: documentRows
          .filter((document) => document.worker_id === worker.user_id)
          .map((document) => ({
            document_type: document.document_type,
            uploaded_at: document.uploaded_at,
            signed_url: signedByPath.get(document.storage_path) ?? null,
          })),
      };
    });
  }

  // APROBAR O RECHAZAR UN TRABAJADOR
  async reviewWorker(
    workerId: string,
    adminId: string,
    input: ReviewWorkerDto,
  ) {
    const client = this.supabase.admin;

    const { data: worker, error: searchError } = await client
      .from('worker_profiles')
      .select('user_id, review_status, submitted_at')
      .eq('user_id', workerId)
      .maybeSingle();

    if (searchError) {
      throw new InternalServerErrorException(
        'No se pudo consultar el trabajador.',
      );
    }

    if (!worker) {
      throw new NotFoundException(
        'No se encontró el trabajador.',
      );
    }

    if (
      worker.review_status !== 'pending' ||
      !worker.submitted_at
    ) {
      throw new ConflictException(
        'El trabajador no tiene una solicitud pendiente de revisión.',
      );
    }

    if (input.decision === 'approved') {
      const { data: identityDocument, error: documentError } = await client
        .from('worker_documents')
        .select('id')
        .eq('worker_id', workerId)
        .eq('document_type', 'identity_card')
        .maybeSingle();

      if (documentError) {
        throw new InternalServerErrorException(
          'No se pudo verificar el documento de identidad del trabajador.',
        );
      }
      if (!identityDocument) {
        throw new BadRequestException(
          'No se puede aprobar al trabajador sin un documento de identidad.',
        );
      }
    }

    const { data: updatedWorker, error: updateError } = await client
      .from('worker_profiles')
      .update({
        review_status: input.decision,
        reviewed_by: adminId,
        reviewed_at: new Date().toISOString(),
        review_notes: input.notes?.trim() || null,
      })
      .eq('user_id', workerId)
      .eq('review_status', 'pending')
      .not('submitted_at', 'is', null)
      .select('user_id')
      .maybeSingle();

    if (updateError) {
      throw new InternalServerErrorException(
        'No se pudo registrar la decisión.',
      );
    }

    if (!updatedWorker) {
      throw new ConflictException(
        'La solicitud ya fue revisada por otro administrador.',
      );
    }

    return {
      message:
        input.decision === 'approved'
          ? 'Trabajador aprobado correctamente.'
          : 'Trabajador rechazado correctamente.',
      reviewStatus: input.decision,
    };
  }
}
