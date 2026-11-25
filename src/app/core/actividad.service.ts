import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';

export interface Actividad {
  id: number;
  usuario_id: string | null;
  accion: string;
  entidad: string;
  entidad_id: string | null;
  detalle: Record<string, any> | null;
  created_at: string;
  autor?: string;
}

@Injectable({ providedIn: 'root' })
export class ActividadService {
  private sb = inject(SupabaseService).client;
  readonly PAGINA = 20;

  async listar(accion: string | null, desde: number): Promise<{ items: Actividad[]; total: number }> {
    let q = this.sb.from('actividad_log').select('*', { count: 'exact' });
    if (accion) q = q.eq('accion', accion);
    const { data, error, count } = await q
      .order('created_at', { ascending: false })
      .range(desde, desde + this.PAGINA - 1);
    if (error) throw error;
    const filas = (data ?? []) as Actividad[];

    const ids = [...new Set(filas.map((f) => f.usuario_id).filter((x): x is string => !!x))];
    const nombres = new Map<string, string>();
    if (ids.length) {
      const { data: perfiles } = await this.sb
        .from('perfiles').select('id, nombre, apellido, email').in('id', ids);
      for (const p of perfiles ?? []) {
        nombres.set(p.id, `${p.nombre} ${p.apellido}`.trim() || p.email);
      }
    }

    return {
      items: filas.map((f) => ({
        ...f,
        autor: f.usuario_id ? nombres.get(f.usuario_id) ?? 'Cuenta anónima' : 'Sistema',
      })),
      total: count ?? 0,
    };
  }
}