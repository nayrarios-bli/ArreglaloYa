import {
  ConflictException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseService } from '../../database/supabase.service.js';
import { CreateReviewDto } from './reviews.dto.js';

@Injectable()
export class ReviewsService {
  constructor(private readonly supabase: SupabaseService) {}

  async create(authorId: string, authorRole: 'client' | 'worker', dto: CreateReviewDto) {
    const { data: service, error: serviceError } = await this.supabase.admin
      .from('services')
      .select('client_id, worker_id, status')
      .eq('id', dto.serviceId)
      .maybeSingle();

    if (serviceError) throw new InternalServerErrorException('No se pudo verificar el servicio.');
    if (!service) throw new NotFoundException('No se encontró el servicio.');
    if (service.status !== 'completed') throw new ConflictException('Solo puedes calificar un servicio finalizado.');

    const expectedAuthor = authorRole === 'client' ? service.client_id : service.worker_id;
    const subjectId = authorRole === 'client' ? service.worker_id : service.client_id;
    if (authorId !== expectedAuthor) throw new ForbiddenException('Solo puedes calificar un servicio en el que participaste.');

    const { data, error } = await this.supabase.admin
      .from('reviews')
      .insert({
        service_id: dto.serviceId,
        author_id: authorId,
        subject_id: subjectId,
        score: dto.score,
        comment: dto.comment || null,
      })
      .select('id, service_id, author_id, subject_id, score, comment, created_at')
      .single();

    if (error?.code === '23505') throw new ConflictException('Ya calificaste este servicio.');
    if (error) throw new InternalServerErrorException('No se pudo guardar la calificación.');
    return data;
  }

  async findByService(userId: string, serviceId: string) {
    const { data: service, error: serviceError } = await this.supabase.admin
      .from('services')
      .select('client_id, worker_id')
      .eq('id', serviceId)
      .maybeSingle();
    if (serviceError) throw new InternalServerErrorException('No se pudo verificar el servicio.');
    if (!service) throw new NotFoundException('No se encontró el servicio.');
    if (userId !== service.client_id && userId !== service.worker_id) {
      throw new ForbiddenException('Solo los participantes pueden consultar estas calificaciones.');
    }

    const { data, error } = await this.supabase.admin
      .from('reviews')
      .select('id, service_id, author_id, subject_id, score, comment, created_at')
      .eq('service_id', serviceId)
      .order('created_at');
    if (error) throw new InternalServerErrorException('No se pudieron consultar las calificaciones.');
    return data ?? [];
  }
}
