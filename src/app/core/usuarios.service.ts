import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { Rol, UsuarioLista } from './models';

@Injectable({ providedIn: 'root' })

export class UsuariosService {
  private sb = inject(SupabaseService).client;

  async listar(): Promise<UsuarioLista[]> {
    const { data, error } = await this.sb
      .from('perfiles').select('id, email, nombre, apellido, rol').order('apellido');
    if (error) throw error;
    return data as UsuarioLista[];
  }

  async cambiarRol(id: string, rol: Rol) {
    const { error } = await this.sb.rpc('cambiar_rol', { p_usuario: id, p_rol: rol });
    if (error) throw error;
  }
}