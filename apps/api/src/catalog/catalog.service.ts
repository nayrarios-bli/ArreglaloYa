import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service.js';

@Injectable()
export class CatalogService {
  constructor(private readonly supabase: SupabaseService) {}

  async findCategories() {
    const { data, error } = await this.supabase.client
      .from('categories')
      .select('id, name, description')
      .eq('is_active', true)
      .order('name');

    if (error) {
      throw new InternalServerErrorException('No se pudieron consultar las categorías.');
    }
    return data ?? [];
  }
}
