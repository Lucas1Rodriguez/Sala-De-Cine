import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { Categoria, Producto } from './models';

@Injectable({ providedIn: 'root' })

export class ProductosService {
  private sb = inject(SupabaseService).client;

  async categorias(): Promise<Categoria[]> {
    const { data, error } = await this.sb.from('categorias_producto').select('*').order('nombre');
    if (error) throw error;
    return data as Categoria[];
  }

  async crearCategoria(nombre: string) {
    const { error } = await this.sb.from('categorias_producto').insert({ nombre });
    if (error) throw error;
  }

  async eliminarCategoria(id: number) {
    const { error } = await this.sb.from('categorias_producto').delete().eq('id', id);
    if (error) throw error;
  }

  async todos(): Promise<Producto[]> {
    const { data, error } = await this.sb.from('productos').select('*').order('nombre');
    if (error) throw error;
    return data as Producto[];
  }

  async activos(): Promise<Producto[]> {
    const { data, error } = await this.sb.from('productos').select('*').eq('activo', true).order('nombre');
    if (error) throw error;
    return data as Producto[];
  }

  async crear(p: Pick<Producto, 'nombre' | 'categoria_id' | 'precio'>) {
    const { error } = await this.sb.from('productos').insert(p);
    if (error) throw error;
  }

  async actualizar(id: string, campos: Partial<Producto>) {
    const { error } = await this.sb.from('productos').update(campos).eq('id', id);
    if (error) throw error;
  }

  async eliminar(id: string) {
    const { error } = await this.sb.from('productos').delete().eq('id', id);
    if (error) throw error;
  }
}