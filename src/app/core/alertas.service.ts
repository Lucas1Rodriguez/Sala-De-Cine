import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class AlertasService {
  private sb = inject(SupabaseService).client;
  private auth = inject(AuthService);

  readonly activas = signal<Set<string>>(new Set());
  private readonly usuarioId = computed(() => this.auth.perfil()?.id ?? null);

  constructor() {
    effect(() => {
      if (this.usuarioId()) this.cargar();
      else this.activas.set(new Set());
    });
  }

  async cargar() {
    const { data } = await this.sb
      .from('alertas_estreno')
      .select('pelicula_id')
      .is('avisada_at', null);
    this.activas.set(new Set((data ?? []).map((r: any) => r.pelicula_id as string)));
  }

  async alternar(peliculaId: string) {
    const uid = this.usuarioId();
    if (!uid) throw new Error('Iniciá sesión para activar la alerta');
    const activa = this.activas().has(peliculaId);
    if (activa) {
      const { error } = await this.sb.from('alertas_estreno').delete().eq('pelicula_id', peliculaId);
      if (error) throw error;
    } else {
      await this.sb.from('alertas_estreno').delete().eq('pelicula_id', peliculaId);
      const { error } = await this.sb.from('alertas_estreno')
        .insert({ usuario_id: uid, pelicula_id: peliculaId });
      if (error) throw error;
    }
    this.activas.update((s) => {
      const n = new Set(s);
      activa ? n.delete(peliculaId) : n.add(peliculaId);
      return n;
    });
  }

  async avisarAperturas() {
    await this.sb.rpc('avisar_aperturas_venta');
  }
}