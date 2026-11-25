import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { RealtimeChannel, Session } from '@supabase/supabase-js';
import { SupabaseService } from './supabase.service';
import { Perfil, RegistroDatos } from './models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private sb = inject(SupabaseService).client;
  private router = inject(Router);

  readonly session = signal<Session | null>(null);
  readonly perfil = signal<Perfil | null>(null);
  readonly avisoPermisos = signal('');

  readonly esRegistrado = computed(() => !!this.perfil());
  readonly esAdmin = computed(() => this.perfil()?.rol === 'admin');
  readonly esStaff = computed(() => ['admin', 'empleado'].includes(this.perfil()?.rol ?? ''));

  private resolverListo!: () => void;
  readonly listo = new Promise<void>((r) => (this.resolverListo = r));

  private canalPerfil?: RealtimeChannel;
  private escuchandoId?: string;

  constructor() {
    this.sb.auth.onAuthStateChange((_evento, session) => {
      this.session.set(session);
      setTimeout(() => this.cargarPerfil(), 0);
    });
  }

  async cargarPerfil() {
    const user = this.session()?.user;
    const rolAntes = this.perfil()?.rol;

    if (!user || user.is_anonymous) {
      this.perfil.set(null);
      this.escucharPerfil(null);
    } else {
      const { data } = await this.sb.from('perfiles').select('*').eq('id', user.id).single();
      this.perfil.set(data as Perfil | null);
      this.escucharPerfil(user.id);
      if (rolAntes && data && rolAntes !== data.rol) this.alCambiarRol();
    }
    this.resolverListo();
  }

  private escucharPerfil(id: string | null) {
    if (this.escuchandoId === (id ?? undefined)) return;
    if (this.canalPerfil) {
      this.sb.removeChannel(this.canalPerfil);
      this.canalPerfil = undefined;
    }
    this.escuchandoId = id ?? undefined;
    if (!id) return;

    this.canalPerfil = this.sb
      .channel(`perfil-${id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'perfiles', filter: `id=eq.${id}` },
        (payload: any) => {
          const actual = this.perfil();
          if (!actual) return;
          const nuevo = payload.new as Perfil;
          this.perfil.set({ ...actual, ...nuevo });
          if (actual.rol !== nuevo.rol) this.alCambiarRol();
        }
      )
      .subscribe();
  }

  private alCambiarRol() {
    const url = this.router.url;
    const fuera =
      (url.startsWith('/admin') && !this.esAdmin()) || (url.startsWith('/validar') && !this.esStaff());
    if (fuera) {
      this.avisoPermisos.set('Tus permisos cambiaron y ya no tenés acceso a esa sección.');
      this.router.navigate(['/']);
    }
  }

  async registrar(d: RegistroDatos) {
    const { error } = await this.sb.auth.signUp({
      email: d.email,
      password: d.password,
      options: {
        data: {
          nombre: d.nombre,
          apellido: d.apellido,
          fecha_nacimiento: d.fecha_nacimiento,
          tipo_sangre: d.tipo_sangre,
          color_ojos: d.color_ojos,
          dias_vacaciones: d.dias_vacaciones,
        },
      },
    });
    if (error) throw error;
  }

  async login(email: string, password: string) {
    const { error } = await this.sb.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }

  async logout() {
    await this.sb.auth.signOut();
  }

  async asegurarSesion() {
    if (!this.session()) {
      const { error } = await this.sb.auth.signInAnonymously();
      if (error) throw error;
    }
  }
}