import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { Butaca, FuncionDetalle } from './models';

@Injectable({ providedIn: 'root' })

export class ButacasService {
  private sb = inject(SupabaseService).client;

  async funcion(id: string): Promise<FuncionDetalle | null> {
    const { data, error } = await this.sb
      .from('funciones')
      .select('*, peliculas(nombre, clasificacion_edad), salas(nombre)')
      .eq('id', id)
      .is('cancelada_at', null)
      .maybeSingle();
    if (error) throw error;
    return data as unknown as FuncionDetalle | null;
  }

  async butacas(salaId: string): Promise<Butaca[]> {
    const { data, error } = await this.sb
      .from('butacas')
      .select('*')
      .eq('sala_id', salaId)
      .order('fila')
      .order('numero');
    if (error) throw error;
    return data as Butaca[];
  }

  async ocupadas(funcionId: string): Promise<Set<string>> {
    await this.sb.rpc('liberar_reservas_vencidas');
    const { data, error } = await this.sb
      .from('asientos_ocupados')
      .select('butaca_id')
      .eq('funcion_id', funcionId);
    if (error) throw error;
    return new Set((data ?? []).map((r: any) => r.butaca_id));
  }

  async recargoVip(): Promise<number> {
    const { data } = await this.sb
      .from('configuracion')
      .select('valor')
      .eq('clave', 'recargo_vip_pct')
      .maybeSingle();
    return Number(data?.valor ?? 0);
  }

  escuchar(funcionId: string, cb: (tipo: 'add' | 'remove', butacaId: string) => void) {
    const canal = this.sb
      .channel(`asientos-${funcionId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'asientos_ocupados' }, (payload: any) => {
        const fila = payload.eventType === 'DELETE' ? payload.old : payload.new;
        if (fila?.funcion_id !== funcionId) return;
        cb(payload.eventType === 'DELETE' ? 'remove' : 'add', fila.butaca_id);
      })
      .subscribe();
    return () => this.sb.removeChannel(canal);
  }

   async reservar(
    funcionId: string,
    butacaIds: string[],
    email: string,
    items: { producto_id: string; cantidad: number }[] = [],
    combos: { combo_id: string; cantidad: number }[] = []
  ): Promise<string> {
    const { data, error } = await this.sb.rpc('reservar_butacas', {
      p_funcion: funcionId,
      p_butacas: butacaIds,
      p_email: email,
      p_items: items,
      p_combos: combos,
    });
    if (error) throw error;
    return data as string;
  }

  async precioVigente(funcionId: string): Promise<number> {
    const { data, error } = await this.sb.rpc('precio_vigente', { p_funcion: funcionId });
    if (error) throw error;
    return Number(data);
  }
}