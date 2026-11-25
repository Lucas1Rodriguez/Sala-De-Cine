import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { Cupon } from './models';

@Injectable({ providedIn: 'root' })
export class CuponesService {
  private sb = inject(SupabaseService).client;

  async listar(): Promise<Cupon[]> {
    const { data, error } = await this.sb.from('cupones').select('*').order('tipo').order('codigo');
    if (error) throw error;
    return data as Cupon[];
  }

  async crear(c: Pick<Cupon, 'codigo' | 'tipo' | 'porcentaje'>) {
    const { error } = await this.sb.from('cupones').insert(c);
    if (error) throw error;
  }

  async actualizar(id: string, campos: Partial<Cupon>) {
    const { error } = await this.sb.from('cupones').update(campos).eq('id', id);
    if (error) throw error;
  }

  async eliminar(id: string) {
    const { error } = await this.sb.from('cupones').delete().eq('id', id);
    if (error) throw error;
  }
}