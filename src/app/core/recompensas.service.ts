import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { Recompensa } from './models';

@Injectable({ providedIn: 'root' })
export class RecompensasService {
  private sb = inject(SupabaseService).client;

  async activas(): Promise<Recompensa[]> {
    const { data, error } = await this.sb
      .from('recompensas').select('*, productos(nombre)').eq('activa', true).order('puntos_costo');
    if (error) throw error;
    return data as unknown as Recompensa[];
  }

  async todas(): Promise<Recompensa[]> {
    const { data, error } = await this.sb
      .from('recompensas').select('*, productos(nombre)').order('puntos_costo');
    if (error) throw error;
    return data as unknown as Recompensa[];
  }

  async crear(r: { tipo: 'entrada' | 'producto'; producto_id: string | null; puntos_costo: number }) {
    const { error } = await this.sb.from('recompensas').insert(r);
    if (error) throw error;
  }

  async actualizar(id: string, campos: Partial<Recompensa>) {
    const { error } = await this.sb.from('recompensas').update(campos).eq('id', id);
    if (error) throw error;
  }

  async eliminar(id: string) {
    const { error } = await this.sb.from('recompensas').delete().eq('id', id);
    if (error) throw error;
  }
}