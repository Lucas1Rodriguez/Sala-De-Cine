import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { RealtimeChannel } from '@supabase/supabase-js';
import { SupabaseService } from './supabase.service';
import { AuthService } from './auth.service';

export interface Notificacion {
  id: string;
  tipo: string;
  titulo: string;
  mensaje: string;
  pelicula_id: string | null;
  funcion_id: string | null;
  leida: boolean;
  created_at: string;
}

@Injectable({ providedIn: 'root' })
export class NotificacionesService {
  private sb = inject(SupabaseService).client;
  private auth = inject(AuthService);

  readonly lista = signal<Notificacion[]>([]);
  readonly noLeidas = computed(() => this.lista().filter((n) => !n.leida).length);

  private readonly usuarioId = computed(() => this.auth.perfil()?.id ?? null);
  private canal?: RealtimeChannel;

  constructor() {
    effect(() => {
      const id = this.usuarioId();
      this.detener();
      if (id) this.iniciar(id);
    });
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && this.usuarioId()) this.recargar();
    });
  }

  private async iniciar(id: string) {
    await this.recargar();
    const { data } = await this.sb
      .from('notificaciones')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(30);
    this.lista.set((data ?? []) as Notificacion[]);

    this.canal = this.sb
      .channel(`notif-${id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notificaciones', filter: `usuario_id=eq.${id}` },
        (payload: any) => this.lista.update((l) => [payload.new as Notificacion, ...l])
      )
      .subscribe((estado, err) => console.log('Realtime notificaciones:', estado, err ?? ''));
  }

  private detener() {
    if (this.canal) {
      this.sb.removeChannel(this.canal);
      this.canal = undefined;
    }
    this.lista.set([]);
  }

  async recargar() {
    const { data } = await this.sb
      .from('notificaciones')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(30);
    this.lista.set((data ?? []) as Notificacion[]);
  }

  async marcarLeida(n: Notificacion) {
    if (n.leida) return;
    const { error } = await this.sb.from('notificaciones').update({ leida: true }).eq('id', n.id);
    if (error) throw error;
    this.lista.update((l) => l.map((x) => (x.id === n.id ? { ...x, leida: true } : x)));
  }

  async marcarTodas() {
    const { error } = await this.sb.from('notificaciones').update({ leida: true }).eq('leida', false);
    if (error) throw error;
    this.lista.update((l) => l.map((x) => ({ ...x, leida: true })));
  }
}