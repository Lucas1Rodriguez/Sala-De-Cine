import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';

export interface PeliculaVista {
  id: string;
  nombre: string;
  imagen_url: string | null;
  clasificacion_edad: number;
  ultima_vez: string;
  veces: number;
  estrellas: number | null;
  comentario: string | null;
}

interface FilaOrden {
  funciones: {
    inicio: string;
    peliculas: { id: string; nombre: string; imagen_url: string | null; clasificacion_edad: number } | null;
  } | null;
}

@Injectable({ providedIn: 'root' })
export class HistorialService {
  private sb = inject(SupabaseService).client;

  async vistas(usuarioId: string): Promise<PeliculaVista[]> {
    const [ordenes, resenas] = await Promise.all([
      this.sb
        .from('ordenes')
        .select('funciones(inicio, peliculas(id, nombre, imagen_url, clasificacion_edad))')
        .eq('estado', 'pagada')
        .not('entrada_validada_at', 'is', null),
      this.sb.from('resenas').select('pelicula_id, estrellas, comentario').eq('usuario_id', usuarioId),
    ]);
    if (ordenes.error) throw ordenes.error;

    const mias = new Map((resenas.data ?? []).map((r: any) => [r.pelicula_id as string, r]));
    const porPelicula = new Map<string, PeliculaVista>();

    for (const o of (ordenes.data ?? []) as unknown as FilaOrden[]) {
      const f = o.funciones;
      const p = f?.peliculas;
      if (!f || !p) continue;

      const previa = porPelicula.get(p.id);
      if (previa) {
        previa.veces++;
        if (f.inicio > previa.ultima_vez) previa.ultima_vez = f.inicio;
      } else {
        const r = mias.get(p.id);
        porPelicula.set(p.id, {
          id: p.id, nombre: p.nombre, imagen_url: p.imagen_url,
          clasificacion_edad: p.clasificacion_edad,
          ultima_vez: f.inicio, veces: 1,
          estrellas: r?.estrellas ?? null, comentario: r?.comentario ?? null,
        });
      }
    }

    return [...porPelicula.values()].sort((a, b) => b.ultima_vez.localeCompare(a.ultima_vez));
  }
}