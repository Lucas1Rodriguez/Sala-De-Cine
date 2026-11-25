import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { Funcion, FuncionDePelicula } from './models';

export interface NuevaProgramacion {
  pelicula: string;
  dias: number[];
  hora: string;
  formato: string;
  idioma: string;
  desde: string;
  hasta: string;
  precio: number;
}

export interface ResultadoCancelacion {
  ordenes_acreditadas: number;
  monto_acreditado: number;
  butacas_liberadas: number;
  ordenes_anonimas: { codigo: string; email: string; monto: number }[];
}


@Injectable({ providedIn: 'root' })
export class FuncionesService {
  private sb = inject(SupabaseService).client;

  async crearProgramacion(p: NuevaProgramacion) {
    const { error } = await this.sb.rpc('crear_programacion', {
      p_pelicula: p.pelicula,
      p_dias: p.dias,
      p_hora: p.hora,
      p_formato: p.formato,
      p_idioma: p.idioma,
      p_desde: p.desde,
      p_hasta: p.hasta,
      p_precio: p.precio,
    });
    if (error) throw error;
  }

  async proximas(): Promise<Funcion[]> {
    const { data, error } = await this.sb
      .from('funciones')
      .select('*, peliculas(nombre), salas(nombre)')
      .gte('inicio', new Date().toISOString())
      .order('inicio')
      .limit(150);
    if (error) throw error;
    return data as unknown as Funcion[];
  }

  async eliminar(id: string) {
    const { error } = await this.sb.from('funciones').delete().eq('id', id);
    if (error) throw error;
  }

  async cancelar(id: string, motivo: string): Promise<ResultadoCancelacion> {
    const { data, error } = await this.sb.rpc('cancelar_funcion', {
      p_funcion: id,
      p_motivo: motivo || null,
    });
    if (error) throw error;
    return data as ResultadoCancelacion;
  }

  async deLaPelicula(peliculaId: string): Promise<FuncionDePelicula[]> {
    const { data, error } = await this.sb
      .from('funciones')
      .select('*, salas(nombre)')
      .eq('pelicula_id', peliculaId)
      .is('cancelada_at', null)
      .gte('inicio', new Date().toISOString())
      .order('inicio');
    if (error) throw error;
    return data as unknown as FuncionDePelicula[];
  }
}