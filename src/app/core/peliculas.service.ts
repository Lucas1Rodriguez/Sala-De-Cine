import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { Genero, Pelicula, PeliculaCartelera } from './models';
import { RealtimeChannel } from '@supabase/supabase-js';

@Injectable({ providedIn: 'root' })
export class PeliculasService {
  private sb = inject(SupabaseService).client;

  async generos(): Promise<Genero[]> {
    const { data, error } = await this.sb.from('generos').select('*').order('nombre');
    if (error) throw error;
    return data as Genero[];
  }

  async listar(): Promise<Pelicula[]> {
    const { data, error } = await this.sb
      .from('peliculas')
      .select('*, pelicula_generos(genero_id)')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data as Pelicula[];
  }

  async actualizar(id: string, campos: Partial<Pelicula>) {
    const { error } = await this.sb.from('peliculas').update(campos).eq('id', id);
    if (error) throw error;
  }

  async guardar(campos: Partial<Pelicula>, generoIds: number[], id?: string) {
    let peliculaId = id;
    if (id) {
      await this.actualizar(id, campos);
    } else {
      const { data, error } = await this.sb.from('peliculas').insert(campos).select('id').single();
      if (error) throw error;
      peliculaId = data.id;
    }
    await this.sb.from('pelicula_generos').delete().eq('pelicula_id', peliculaId);
    const filas = generoIds.map((genero_id) => ({ pelicula_id: peliculaId, genero_id }));
    const { error } = await this.sb.from('pelicula_generos').insert(filas);
    if (error) throw error;
    return peliculaId as string;
  }

  async eliminar(id: string) {
    const { error } = await this.sb.from('peliculas').delete().eq('id', id);
    if (error) throw error;
  }

  async subirPoster(file: File): Promise<string> {
    const ext = file.name.split('.').pop();
    const ruta = `${crypto.randomUUID()}.${ext}`;
    const { error } = await this.sb.storage.from('posters').upload(ruta, file, { contentType: file.type });
    if (error) throw error;
    return this.sb.storage.from('posters').getPublicUrl(ruta).data.publicUrl;
  }

  async publicadas(): Promise<PeliculaCartelera[]> {
    const { data, error } = await this.sb
      .from('peliculas')
      .select('*, pelicula_generos(genero_id, generos(id, nombre))')
      .eq('publicada', true)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data as unknown as PeliculaCartelera[];
  }

  async masVendidas(n = 3): Promise<string[]> {
    const { data } = await this.sb.rpc('top_peliculas', { p_n: n });
    return (data ?? []).map((r: any) => r.pelicula_id);
  }

  async una(id: string): Promise<PeliculaCartelera | null> {
    const { data, error } = await this.sb
      .from('peliculas')
      .select('*, pelicula_generos(genero_id, generos(id, nombre))')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return data as unknown as PeliculaCartelera | null;
  }

  escucharCambios(alCambiar: (fila: any) => void): RealtimeChannel {
    return this.sb
      .channel(`peliculas-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'peliculas' },
          (payload: any) => alCambiar(payload.new))
      .subscribe();
  }

  dejarDeEscuchar(canal: RealtimeChannel) {
    this.sb.removeChannel(canal);
  }


}