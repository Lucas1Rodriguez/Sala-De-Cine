import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { Combo } from './models';

@Injectable({ providedIn: 'root' })
export class CombosService {
  private sb = inject(SupabaseService).client;
  private readonly cols = '*, combo_items(cantidad, productos(nombre))';

  async todos(): Promise<Combo[]> {
    const { data, error } = await this.sb.from('combos').select(this.cols).order('nombre');
    if (error) throw error;
    return data as unknown as Combo[];
  }

  async activos(): Promise<Combo[]> {
    const { data, error } = await this.sb.from('combos').select(this.cols).eq('activo', true).order('precio');
    if (error) throw error;
    return data as unknown as Combo[];
  }

  async crear(
    c: { nombre: string; descripcion: string | null; precio: number; incluye_entrada: boolean },
    items: { producto_id: string; cantidad: number }[]
  ) {
    const { data, error } = await this.sb.from('combos').insert(c).select('id').single();
    if (error) throw error;
    const { error: errItems } = await this.sb
      .from('combo_items')
      .insert(items.map((i) => ({ ...i, combo_id: data.id })));
    if (errItems) {
      await this.sb.from('combos').delete().eq('id', data.id); // deshace todo
      throw errItems;
    }
  }

  async actualizar(id: string, campos: Partial<Combo>) {
    const { error } = await this.sb.from('combos').update(campos).eq('id', id);
    if (error) throw error;
  }

  async eliminar(id: string) {
    const { error } = await this.sb.from('combos').delete().eq('id', id);
    if (error) throw error;
  }
}