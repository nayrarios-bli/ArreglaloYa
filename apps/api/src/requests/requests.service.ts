import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { SupabaseService } from '../database/supabase.service.js';

const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;
const SIGNED_URL_TTL_SECONDS = 60 * 60;
const IMAGE_EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

interface UploadedImage {
  buffer: Buffer;
  mimetype: string;
  size: number;
}

interface CreateRequestInput {
  categoryId: string;
  zoneId: string;
  title: string;
  description: string;
  availableFrom?: string;
  availableUntil?: string;
}

@Injectable()
export class RequestsService {
  constructor(private readonly supabase: SupabaseService) {}

  async listCompatible(workerId: string) {
    const profile = await this.getWorkerMatch(workerId);
    if (!profile.profileReady) return { profileReady: false, requests: [] };

    const { data, error } = await this.supabase.admin
      .from('repair_requests')
      .select('id, title, description, category_id, zone_id, available_from, available_until, created_at, expires_at')
      .eq('status', 'open')
      .gt('expires_at', new Date().toISOString())
      .in('category_id', profile.categories.map((category) => category.id))
      .in('zone_id', profile.zones.map((zone) => zone.id))
      .order('created_at', { ascending: false });

    if (error) this.fail('No se pudieron consultar las solicitudes compatibles.');

    const categories = new Map(profile.categories.map((category) => [category.id, category]));
    const zones = new Map(profile.zones.map((zone) => [zone.id, zone]));

    return {
      profileReady: true,
      requests: (data ?? []).map((request) => ({
        ...request,
        category: categories.get(request.category_id) ?? null,
        zone: zones.get(request.zone_id) ?? null,
      })),
    };
  }

  async getCompatibleDetail(workerId: string, requestId: string) {
    const profile = await this.getWorkerMatch(workerId);
    if (!profile.profileReady) {
      throw new NotFoundException('No se encontró una solicitud compatible.');
    }

    const { data: request, error: requestError } = await this.supabase.admin
      .from('repair_requests')
      .select('id, title, description, category_id, zone_id, available_from, available_until, created_at, expires_at')
      .eq('id', requestId)
      .eq('status', 'open')
      .gt('expires_at', new Date().toISOString())
      .in('category_id', profile.categories.map((category) => category.id))
      .in('zone_id', profile.zones.map((zone) => zone.id))
      .maybeSingle();

    if (requestError) this.fail('No se pudo consultar el detalle de la solicitud.');
    if (!request) throw new NotFoundException('No se encontró una solicitud compatible.');

    const { data: attachments, error: attachmentsError } = await this.supabase.admin
      .from('request_attachments')
      .select('id, storage_path, uploaded_at')
      .eq('request_id', requestId)
      .order('uploaded_at', { ascending: true });

    if (attachmentsError) this.fail('No se pudieron consultar las fotos de la solicitud.');

    const bucket = process.env.SUPABASE_REQUEST_PHOTOS_BUCKET ?? 'request-photos';
    const storage = this.supabase.admin.storage.from(bucket);
    const signedAttachments = await Promise.all(
      (attachments ?? []).map(async (attachment) => {
        const { data, error } = await storage.createSignedUrl(
          attachment.storage_path,
          SIGNED_URL_TTL_SECONDS,
        );
        if (error) this.fail('No se pudo preparar una foto de la solicitud.');
        return {
          id: attachment.id,
          uploaded_at: attachment.uploaded_at,
          signed_url: data.signedUrl,
        };
      }),
    );

    return {
      ...request,
      category: profile.categories.find((category) => category.id === request.category_id) ?? null,
      zone: profile.zones.find((zone) => zone.id === request.zone_id) ?? null,
      attachments: signedAttachments,
    };
  }

  private async getWorkerMatch(workerId: string) {
    const client = this.supabase.admin;
    const [workerCategories, workerZones] = await Promise.all([
      client.from('worker_categories').select('category_id').eq('worker_id', workerId),
      client.from('worker_zones').select('zone_id').eq('worker_id', workerId),
    ]);

    if (workerCategories.error || workerZones.error) {
      this.fail('No se pudieron consultar las especialidades y zonas del trabajador.');
    }

    const categoryIds = [...new Set((workerCategories.data ?? []).map((row) => row.category_id))];
    const zoneIds = [...new Set((workerZones.data ?? []).map((row) => row.zone_id))];
    if (!categoryIds.length || !zoneIds.length) {
      return { profileReady: false as const, categories: [], zones: [] };
    }

    const [categoriesResult, zonesResult] = await Promise.all([
      client.from('categories').select('id, name').in('id', categoryIds).eq('is_active', true),
      client.from('service_zones').select('id, name, city').in('id', zoneIds).eq('is_active', true),
    ]);

    if (categoriesResult.error || zonesResult.error) {
      this.fail('No se pudieron verificar las categorías y zonas activas.');
    }

    const categories = categoriesResult.data ?? [];
    const zones = zonesResult.data ?? [];
    return {
      profileReady: categories.length > 0 && zones.length > 0,
      categories,
      zones,
    };
  }

  async getClientZone(clientId: string) {
    const { data, error } = await this.supabase.admin
      .from('client_profiles')
      .select('home_zone_id')
      .eq('user_id', clientId)
      .maybeSingle();

    if (error) this.fail('No se pudo consultar la zona del perfil.');
    if (!data) throw new NotFoundException('No se encontró el perfil del cliente.');
    return { homeZoneId: data.home_zone_id };
  }

  async create(clientId: string, value: unknown) {
    const input = parseCreateRequest(value);
    const client = this.supabase.admin;

    const { data: category, error: categoryError } = await client
      .from('categories')
      .select('id')
      .eq('id', input.categoryId)
      .eq('is_active', true)
      .maybeSingle();

    if (categoryError) this.fail('No se pudo verificar la categoría.');
    if (!category) throw new BadRequestException('La categoría no está disponible.');

    const { data: zone, error: zoneError } = await client
      .from('service_zones')
      .select('id')
      .eq('id', input.zoneId)
      .eq('is_active', true)
      .maybeSingle();

    if (zoneError) this.fail('No se pudo verificar la zona.');
    if (!zone) throw new BadRequestException('La zona no está disponible.');

    const { data: profile, error: profileError } = await client
      .from('client_profiles')
      .update({ home_zone_id: input.zoneId })
      .eq('user_id', clientId)
      .select('user_id')
      .maybeSingle();

    if (profileError) this.fail('No se pudo guardar la zona en tu perfil.');
    if (!profile) throw new NotFoundException('No se encontró el perfil del cliente.');

    const { data, error } = await client
      .from('repair_requests')
      .insert({
        client_id: clientId,
        category_id: input.categoryId,
        zone_id: input.zoneId,
        title: input.title,
        description: input.description,
        available_from: input.availableFrom ?? null,
        available_until: input.availableUntil ?? null,
        status: 'open',
      })
      .select(
        'id, title, description, category_id, zone_id, status, available_from, available_until, created_at',
      )
      .single();

    if (error) this.fail('No se pudo publicar la solicitud.');
    return data;
  }

  async addAttachment(clientId: string, requestId: string, file?: UploadedImage) {
    if (!file) throw new BadRequestException('Adjunta una imagen.');

    const extension = IMAGE_EXTENSIONS[file.mimetype];
    if (!extension || !hasValidImageSignature(file.buffer, file.mimetype)) {
      throw new BadRequestException('El formato debe ser JPEG, PNG o WebP.');
    }
    if (!file.size || file.size > MAX_ATTACHMENT_BYTES) {
      throw new BadRequestException('La imagen debe pesar como máximo 10 MB.');
    }

    const client = this.supabase.admin;
    const { data: request, error: requestError } = await client
      .from('repair_requests')
      .select('id')
      .eq('id', requestId)
      .eq('client_id', clientId)
      .maybeSingle();

    if (requestError) this.fail('No se pudo verificar la solicitud.');
    if (!request) throw new NotFoundException('No se encontró la solicitud.');

    const bucket = process.env.SUPABASE_REQUEST_PHOTOS_BUCKET ?? 'request-photos';
    const storagePath = `${requestId}/${randomUUID()}.${extension}`;
    const storage = client.storage.from(bucket);
    const { error: uploadError } = await storage.upload(storagePath, file.buffer, {
      contentType: file.mimetype,
      upsert: false,
    });

    if (uploadError) this.fail('No se pudo subir la imagen al almacenamiento.');

    const { data: attachment, error: insertError } = await client
      .from('request_attachments')
      .insert({ request_id: requestId, storage_path: storagePath })
      .select('id, storage_path, uploaded_at')
      .single();

    if (insertError) {
      await storage.remove([storagePath]);
      this.fail('No se pudo asociar la imagen a la solicitud.');
    }

    const { data: signedUrl, error: signedUrlError } = await storage.createSignedUrl(
      storagePath,
      SIGNED_URL_TTL_SECONDS,
    );

    if (signedUrlError) {
      await client.from('request_attachments').delete().eq('id', attachment.id);
      await storage.remove([storagePath]);
      this.fail('No se pudo generar el enlace temporal de la imagen.');
    }

    return {
      ...attachment,
      signedUrl: signedUrl.signedUrl,
      signedUrlExpiresInSeconds: SIGNED_URL_TTL_SECONDS,
    };
  }

  private fail(message: string): never {
    throw new InternalServerErrorException(message);
  }
}

function parseCreateRequest(value: unknown): CreateRequestInput {
  if (!value || typeof value !== 'object') {
    throw new BadRequestException('El cuerpo de la solicitud no es válido.');
  }

  const input = value as Record<string, unknown>;
  const categoryId = typeof input['categoryId'] === 'string' ? input['categoryId'].trim() : '';
  const zoneId = typeof input['zoneId'] === 'string' ? input['zoneId'].trim() : '';
  const title = typeof input['title'] === 'string' ? input['title'].trim() : '';
  const description =
    typeof input['description'] === 'string' ? input['description'].trim() : '';
  const availableFrom = optionalDate(input['availableFrom'], 'availableFrom');
  const availableUntil = optionalDate(input['availableUntil'], 'availableUntil');

  if (!isUuid(categoryId)) throw new BadRequestException('Selecciona una categoría válida.');
  if (!isUuid(zoneId)) throw new BadRequestException('Selecciona una zona válida.');
  if (title.length < 5 || title.length > 120) {
    throw new BadRequestException('El título debe tener entre 5 y 120 caracteres.');
  }
  if (description.length < 20 || description.length > 3000) {
    throw new BadRequestException('La descripción debe tener entre 20 y 3000 caracteres.');
  }
  if (availableFrom && availableUntil && Date.parse(availableUntil) <= Date.parse(availableFrom)) {
    throw new BadRequestException('La fecha final debe ser posterior a la inicial.');
  }

  return { categoryId, zoneId, title, description, availableFrom, availableUntil };
}

function optionalDate(value: unknown, field: string): string | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value !== 'string' || Number.isNaN(Date.parse(value))) {
    throw new BadRequestException(`El campo ${field} debe ser una fecha válida.`);
  }
  return new Date(value).toISOString();
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function hasValidImageSignature(buffer: Buffer, mimeType: string): boolean {
  if (mimeType === 'image/jpeg') {
    return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  }

  if (mimeType === 'image/png') {
    return buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  }

  if (mimeType === 'image/webp') {
    return (
      buffer.length >= 12 &&
      buffer.toString('ascii', 0, 4) === 'RIFF' &&
      buffer.toString('ascii', 8, 12) === 'WEBP'
    );
  }

  return false;
}
