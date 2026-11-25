import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';

export type EstadoPropuesta = 'pendiente' | 'aceptada' | 'rechazada';

export interface Propuesta {
  id: string;
  usuario_id: string;
  titulo: string;
  descripcion: string;
  motivo: string;
  estado: EstadoPropuesta;
  motivo_rechazo: string | null;
  pelicula_id: string | null;
  created_at: string;
  resuelta_at: string | null;
  autor?: string;
}

export const ESTADOS: Record<EstadoPropuesta, string> = {
  pendiente: 'En revisión',
  aceptada: 'Aceptada',
  rechazada: 'Rechazada',
};

@Injectable({ providedIn: 'root' })
export class PropuestasService {
  private sb = inject(SupabaseService).client;

  async crear(titulo: string, descripcion: string, motivo: string) {
    const { error } = await this.sb.rpc('crear_propuesta', {
      p_titulo: titulo, p_descripcion: descripcion, p_motivo: motivo,
    });
    if (error) throw error;
  }

  async mias(usuarioId: string): Promise<Propuesta[]> {
    const { data, error } = await this.sb
      .from('propuestas_peliculas').select('*')
      .eq('usuario_id', usuarioId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data as Propuesta[];
  }

  async todas(): Promise<Propuesta[]> {
    const { data, error } = await this.sb
      .from('propuestas_peliculas').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    const filas = data as Propuesta[];

    const ids = [...new Set(filas.map((f) => f.usuario_id))];
    const nombres = new Map<string, string>();
    if (ids.length) {
      const { data: perfiles } = await this.sb
        .from('perfiles').select('id, nombre, apellido, email').in('id', ids);
      for (const p of perfiles ?? []) nombres.set(p.id, `${p.nombre} ${p.apellido}`.trim() || p.email);
    }
    return filas.map((f) => ({ ...f, autor: nombres.get(f.usuario_id) ?? 'Cliente' }));
  }

  async una(id: string): Promise<Propuesta | null> {
    const { data, error } = await this.sb
      .from('propuestas_peliculas').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    return data as Propuesta | null;
  }

  async resolver(id: string, aceptar: boolean, motivo: string | null = null, peliculaId: string | null = null) {
    const { error } = await this.sb.rpc('resolver_propuesta', {
      p_id: id, p_aceptar: aceptar, p_motivo: motivo, p_pelicula: peliculaId,
    });
    if (error) throw error;
  }
}