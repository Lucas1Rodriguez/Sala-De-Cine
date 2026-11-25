import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { CalculoPago, OrdenDetalle, Canje, CompraResumen } from './models';

@Injectable({ providedIn: 'root' })
export class OrdenesService {
  private sb = inject(SupabaseService).client;

  async orden(id: string): Promise<OrdenDetalle | null> {
    const { data, error } = await this.sb
      .from('ordenes')
      .select(`*,
        entradas(precio, estado, reservada_hasta, butacas(fila, numero, tipo)),
        orden_items(cantidad, precio_unitario, productos(nombre), combos(nombre)),
        funciones(id, inicio, formato, idioma, salas(nombre), peliculas(nombre, clasificacion_edad, pelicula_generos(generos(nombre))))`)
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return data as unknown as OrdenDetalle | null;
  }

  async calcular(id: string): Promise<CalculoPago> {
    const { data, error } = await this.sb.rpc('calcular_pago', { p_orden: id });
    if (error) throw error;
    return data as CalculoPago;
  }

  async pagar(id: string) {
    const { error } = await this.sb.rpc('confirmar_pago', { p_orden: id });
    if (error) throw error;
  }

  async canjesPendientes(ordenId: string): Promise<Canje[]> {
    const { data, error } = await this.sb
      .from('canjes').select('*, recompensas(tipo, productos(nombre))')
      .eq('orden_id', ordenId).eq('aplicado', false).order('created_at');
    if (error) throw error;
    return data as unknown as Canje[];
  }

  async canjear(ordenId: string, recompensaId: string) {
    const { error } = await this.sb.rpc('canjear_en_orden', { p_orden: ordenId, p_recompensa: recompensaId });
    if (error) throw error;
  }

  async quitarCanje(id: string) {
    const { error } = await this.sb.rpc('quitar_canje', { p_canje: id });
    if (error) throw error;
  }

  async misCanjes(): Promise<Canje[]> {
    const { data, error } = await this.sb
      .from('canjes').select('*, recompensas(tipo, productos(nombre))')
      .eq('aplicado', true).order('created_at', { ascending: false });
    if (error) throw error;
    return data as unknown as Canje[];
  }

  async misCompras(): Promise<CompraResumen[]> {
    const { data, error } = await this.sb
      .from('ordenes')
      .select('id, estado, total, codigo, created_at, entrada_validada_at, candy_retirado_at, funciones(inicio, peliculas(nombre))')
      .in('estado', ['pagada', 'cancelada'])
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data as unknown as CompraResumen[];
  }

  async usarCredito(ordenId: string, usar: boolean) {
    const { error } = await this.sb.rpc('usar_credito_en_orden', { p_orden: ordenId, p_usar: usar });
    if (error) throw error;
  }

  async cancelar(ordenId: string): Promise<number> {
    const { data, error } = await this.sb.rpc('cancelar_orden', { p_orden: ordenId });
    if (error) throw error;
    return Number(data);
  }
}