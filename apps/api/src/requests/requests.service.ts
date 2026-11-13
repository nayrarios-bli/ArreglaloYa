import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { SupabaseService } from '../supabase/supabase.service.js';

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
  title: string;
  description: string;
  availableFrom?: string;
  availableUntil?: string;
}

@Injectable()
export class RequestsService {
  constructor(private readonly supabase: SupabaseService) {}

  async create(clientId: string, value: unknown) {
    const input = parseCreateRequest(value);
    const client = this.supabase.client;

    const { data: clientProfile, error: profileError } = await client
      .from('client_profiles')
      .select('home_zone_id')
      .eq('user_id', clientId)
      .maybeSingle();

    if (profileError) this.fail('No se pudo consultar el perfil del cliente.');
    if (!clientProfile?.home_zone_id) {
      throw new BadRequestException(
        'Completa tu zona en el perfil antes de publicar una solicitud.',
      );
    }

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
      .eq('id', clientProfile.home_zone_id)
      .eq('is_active', true)
      .maybeSingle();

    if (zoneError) this.fail('No se pudo verificar la zona.');
    if (!zone) throw new BadRequestException('Tu zona no está disponible.');

    const { data, error } = await client
      .from('repair_requests')
      .insert({
        client_id: clientId,
        category_id: input.categoryId,
        zone_id: clientProfile.home_zone_id,
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

    const client = this.supabase.client;
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

  async findCompatible(workerId: string) {
    const client = this.supabase.client;
    const { data: worker, error: workerError } = await client
      .from('worker_profiles')
      .select('review_status')
      .eq('user_id', workerId)
      .maybeSingle();

    if (workerError) this.fail('No se pudo consultar el perfil del trabajador.');
    if (!worker || worker.review_status !== 'approved') {
      throw new ForbiddenException(
        'Solo los trabajadores aprobados pueden consultar solicitudes.',
      );
    }

    const [{ data: categories, error: categoriesError }, { data: zones, error: zonesError }] =
      await Promise.all([
        client.from('worker_categories').select('category_id').eq('worker_id', workerId),
        client.from('worker_zones').select('zone_id').eq('worker_id', workerId),
      ]);

    if (categoriesError || zonesError) {
      this.fail('No se pudieron consultar las especialidades y zonas.');
    }

    const categoryIds = (categories ?? []).map((item) => item.category_id);
    const zoneIds = (zones ?? []).map((item) => item.zone_id);
    if (!categoryIds.length || !zoneIds.length) return [];

    const { data, error } = await client
      .from('repair_requests')
      .select(
        'id, title, description, category:categories(name), zone:service_zones(name), available_from, available_until, created_at',
      )
      .eq('status', 'open')
      .in('category_id', categoryIds)
      .in('zone_id', zoneIds)
      .order('created_at', { ascending: true });

    if (error) this.fail('No se pudieron consultar las solicitudes compatibles.');
    return data ?? [];
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
  const title = typeof input['title'] === 'string' ? input['title'].trim() : '';
  const description =
    typeof input['description'] === 'string' ? input['description'].trim() : '';
  const availableFrom = optionalDate(input['availableFrom'], 'availableFrom');
  const availableUntil = optionalDate(input['availableUntil'], 'availableUntil');

  if (!isUuid(categoryId)) throw new BadRequestException('Selecciona una categoría válida.');
  if (!title || title.length > 120) {
    throw new BadRequestException('El título debe tener entre 1 y 120 caracteres.');
  }
  if (!description || description.length > 3000) {
    throw new BadRequestException('La descripción debe tener entre 1 y 3000 caracteres.');
  }
  if (availableFrom && availableUntil && Date.parse(availableUntil) <= Date.parse(availableFrom)) {
    throw new BadRequestException('La fecha final debe ser posterior a la inicial.');
  }

  return { categoryId, title, description, availableFrom, availableUntil };
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
