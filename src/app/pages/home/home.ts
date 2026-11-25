import { Component, OnInit, OnDestroy, computed, inject, signal } from '@angular/core';
import { RealtimeChannel } from '@supabase/supabase-js';
import { NgTemplateOutlet } from '@angular/common';
import { PeliculasService } from '../../core/peliculas.service';
import { Genero, PeliculaCartelera } from '../../core/models';
import { normalizar, slug } from '../../core/utils';
import { RouterLink } from '@angular/router';
import { ResenasService, StatsPelicula } from '../../core/resenas.service';
import { AuthService } from '../../core/auth.service';
import { AlertasService } from '../../core/alertas.service';
import { aperturaVenta, fmtCorta, hoyAR, ventaAbierta } from '../../core/utils';

@Component({
  selector: 'app-home',
  imports: [NgTemplateOutlet, RouterLink],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home implements OnInit, OnDestroy {
  private svc = inject(PeliculasService);
  private resenasSvc = inject(ResenasService);
  private canal?: RealtimeChannel;
  
  slug = slug;
  cargando = signal(true);
  peliculas = signal<PeliculaCartelera[]>([]);
  generos = signal<Genero[]>([]);
  topIds = signal<string[]>([]);
  busqueda = signal('');
  generosSel = signal<number[]>([]);
  stats = signal<Record<string, StatsPelicula>>({});

  auth = inject(AuthService);
  alertas = inject(AlertasService);
  errorAlerta = signal('');
  fmtCorta = fmtCorta;
  aperturaVenta = aperturaVenta;
  esPreventa = (p: PeliculaCartelera) => !!p.fecha_estreno && p.fecha_estreno > hoyAR();

  proximamente = computed(() =>
    this.peliculas()
      .filter((p) => !ventaAbierta(p))
      .sort((a, b) => (a.fecha_estreno ?? '').localeCompare(b.fecha_estreno ?? ''))
  );

  masVendidas = computed(() =>
    this.topIds()
      .map((id) => this.peliculas().find((p) => p.id === id))
      .filter((p): p is PeliculaCartelera => !!p)
  );

  filtradas = computed(() => {
    const q = normalizar(this.busqueda());
    const sel = this.generosSel();
    return this.peliculas().filter(
      (p) =>
        ventaAbierta(p) &&
        (!q || normalizar(p.nombre).includes(q)) &&
        (!sel.length || p.pelicula_generos.some((g) => sel.includes(g.genero_id)))
    );
  });

  hayFiltros = computed(() => !!this.busqueda() || this.generosSel().length > 0);

   async ngOnInit() {
    try {
      const [peliculas, generos, top, stats] = await Promise.all([
        this.svc.publicadas(),
        this.svc.generos(),
        this.svc.masVendidas(3),
        this.resenasSvc.statsTodas(),
      ]);
      this.peliculas.set(peliculas);
      this.generos.set(generos);
      this.topIds.set(top);
      this.stats.set(stats);
      this.canal = this.svc.escucharCambios((fila) => {
        this.peliculas.update((lista) =>
          fila.publicada
            ? lista.map((p) => (p.id === fila.id ? { ...p, ...fila } : p))
            : lista.filter((p) => p.id !== fila.id)
        );
      });
      this.alertas.avisarAperturas().catch(() => {});
    } finally {
      this.cargando.set(false);
    }
  }

  ngOnDestroy() {
    if (this.canal) this.svc.dejarDeEscuchar(this.canal);
  }

  async alternarAlerta(p: PeliculaCartelera) {
    this.errorAlerta.set('');
    try {
      await this.alertas.alternar(p.id);
    } catch (e: any) {
      this.errorAlerta.set(e.message ?? 'No se pudo actualizar la alerta');
    }
  }


  acento(p: PeliculaCartelera) {
    const nombre = p.pelicula_generos[0]?.generos?.nombre;
    return nombre ? slug(nombre) : null;
  }

  toggleGenero(id: number) {
    this.generosSel.update((l) => (l.includes(id) ? l.filter((x) => x !== id) : [...l, id]));
  }

  limpiar() {
    this.busqueda.set('');
    this.generosSel.set([]);
  }
}