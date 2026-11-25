import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { Butaca, Sala } from './models';

@Injectable({ providedIn: 'root' })
export class SalasService {
  private sb = inject(SupabaseService).client;

  async listar(): Promise<Sala[]> {
    const { data, error } = await this.sb.from('salas').select('*, butacas(count)').order('nombre');
    if (error) throw error;
    return data as unknown as Sala[];
  }

  async crear(nombre: string) {
    const { error } = await this.sb.from('salas').insert({ nombre });
    if (error) throw error;
  }

  async actualizar(id: string, campos: { nombre?: string; activa?: boolean }) {
    const { error } = await this.sb.from('salas').update(campos).eq('id', id);
    if (error) throw error;
  }

  async butacas(salaId: string): Promise<Butaca[]> {
    const { data, error } = await this.sb
      .from('butacas').select('*').eq('sala_id', salaId).order('fila').order('numero');
    if (error) throw error;
    return data as Butaca[];
  }

  async actualizarButacas(ids: string[], campos: Partial<Pick<Butaca, 'tipo' | 'habilitada'>>) {
    const { error } = await this.sb.from('butacas').update(campos).in('id', ids);
    if (error) throw error;
  }
}