import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';

export interface DiaReporte {
  fecha: string;
  total_facturado: number;
  cobrado: number;
  credito_usado: number;
  cant_entradas: number;
  cant_ordenes: number;
  cant_canje: number;
  puntos_canjeados: number;
}

export interface ItemRanking {
  nombre: string;
  valor: number;
}

@Injectable({ providedIn: 'root' })
export class ReportesService {
  private sb = inject(SupabaseService).client;

  async facturacion(desde: string, hasta: string): Promise<DiaReporte[]> {
    const { data, error } = await this.sb.rpc('reporte_facturacion', { p_desde: desde, p_hasta: hasta });
    if (error) throw error;
    return (data ?? []).map((r: any) => ({
      fecha: r.fecha,
      total_facturado: Number(r.total_facturado),
      cobrado: Number(r.cobrado),
      credito_usado: Number(r.credito_usado),
      cant_entradas: Number(r.cant_entradas),
      cant_ordenes: Number(r.cant_ordenes),
      cant_canje: Number(r.cant_canje),
      puntos_canjeados: Number(r.puntos_canjeados),
    }));
  }

  async peliculasMasVistas(desde: string, hasta: string, n = 5): Promise<ItemRanking[]> {
    const { data, error } = await this.sb.rpc('peliculas_mas_vistas', { p_desde: desde, p_hasta: hasta, p_n: n });
    if (error) throw error;
    return (data ?? []).map((r: any) => ({ nombre: r.nombre, valor: Number(r.cantidad) }));
  }

  async productosMasVendidos(desde: string, hasta: string, n = 5): Promise<ItemRanking[]> {
    const { data, error } = await this.sb.rpc('productos_mas_vendidos', { p_desde: desde, p_hasta: hasta, p_n: n });
    if (error) throw error;
    return (data ?? []).map((r: any) => ({ nombre: r.nombre, valor: Number(r.cantidad) }));
  }
}