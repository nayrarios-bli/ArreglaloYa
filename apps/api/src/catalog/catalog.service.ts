import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { SupabaseService } from '../database/supabase.service.js';

@Injectable()
export class CatalogService {
  constructor(private readonly supabase: SupabaseService) {}

  async findCategories() {
    const { data, error } = await this.supabase.admin
      .from('categories')
      .select('id, name, description')
      .eq('is_active', true)
      .order('name');

    if (error) {
      throw new InternalServerErrorException('No se pudieron consultar las categorías.');
    }
    return data ?? [];
  }

  async findZones() {
    const { data, error } = await this.supabase.admin
      .from('service_zones')
      .select('id, name, city')
      .eq('is_active', true)
      .order('name');

    if (error) {
      throw new InternalServerErrorException('No se pudieron consultar las zonas.');
    }
    return data ?? [];
  }
}
