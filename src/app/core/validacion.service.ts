import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { InfoCodigo } from './models';

@Injectable({ providedIn: 'root' })
export class ValidacionService {
  private sb = inject(SupabaseService).client;

  async consultar(codigo: string): Promise<InfoCodigo> {
    const { data, error } = await this.sb.rpc('consultar_codigo', { p_codigo: codigo });
    if (error) throw error;
    return data as InfoCodigo;
  }

  async validar(codigo: string, tipo: 'entrada' | 'candy') {
    const { error } = await this.sb.rpc('validar_codigo', { p_codigo: codigo, p_tipo: tipo });
    if (error) throw error;
  }
}