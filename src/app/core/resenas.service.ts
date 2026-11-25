import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';

export interface Resena {
  id: string;
  estrellas: number;
  comentario: string | null;
  created_at: string;
  autor: string;
  es_mia: boolean;
}
export interface StatsPelicula {
  promedio: number | null;
  cant: number;
}

@Injectable({ providedIn: 'root' })
export class ResenasService {
  private sb = inject(SupabaseService).client;

  async listar(peliculaId: string): Promise<Resena[]> {
    const { data, error } = await this.sb.rpc('resenas_pelicula', { p_pelicula: peliculaId });
    if (error) throw error;
    return data as Resena[];
  }

  async puedeResenar(peliculaId: string): Promise<boolean> {
    const { data } = await this.sb.rpc('puede_resenar', { p_pelicula: peliculaId });
    return !!data;
  }

  async stats(peliculaId: string): Promise<StatsPelicula> {
    const { data } = await this.sb
      .from('peliculas_stats').select('promedio, cant_resenas').eq('pelicula_id', peliculaId).maybeSingle();
    return { promedio: data?.promedio ?? null, cant: data?.cant_resenas ?? 0 };
  }

  async statsTodas(): Promise<Record<string, StatsPelicula>> {
    const { data } = await this.sb.from('peliculas_stats').select('*');
    const mapa: Record<string, StatsPelicula> = {};
    for (const r of data ?? []) mapa[r.pelicula_id] = { promedio: r.promedio, cant: r.cant_resenas };
    return mapa;
  }

  async guardar(usuarioId: string, peliculaId: string, estrellas: number, comentario: string | null) {
    const { error } = await this.sb.from('resenas').upsert(
      { usuario_id: usuarioId, pelicula_id: peliculaId, estrellas, comentario },
      { onConflict: 'usuario_id,pelicula_id' }
    );
    if (error) throw error;
  }
}