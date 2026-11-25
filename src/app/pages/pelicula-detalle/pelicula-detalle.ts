import { Component, OnInit, OnDestroy, computed, inject, signal } from '@angular/core';
import { RealtimeChannel } from '@supabase/supabase-js';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { PeliculasService } from '../../core/peliculas.service';
import { FuncionesService } from '../../core/funciones.service';
import { AuthService } from '../../core/auth.service';
import { ResenasService, Resena, StatsPelicula } from '../../core/resenas.service';
import { FuncionDePelicula, PeliculaCartelera } from '../../core/models';
import { slug, estrellasTexto } from '../../core/utils';
import { AlertasService } from '../../core/alertas.service';
import { aperturaVenta, fmtCorta, ventaAbierta } from '../../core/utils';

@Component({
  selector: 'app-pelicula-detalle',
  imports: [RouterLink],
  templateUrl: './pelicula-detalle.html',
  styleUrl: './pelicula-detalle.scss',
})
export class PeliculaDetalle implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private peliculasSvc = inject(PeliculasService);
  private funcionesSvc = inject(FuncionesService);
  private resenasSvc = inject(ResenasService);
  private canal?: RealtimeChannel;

  slug = slug;
  cargando = signal(true);
  noExiste = signal(false);
  pelicula = signal<PeliculaCartelera | null>(null);
  funciones = signal<FuncionDePelicula[]>([]);
  diaSel = signal('');
  alertas = inject(AlertasService);
  fmtCorta = fmtCorta;
  aperturaVenta = aperturaVenta;
  abierta = computed(() => { const p = this.pelicula(); return !p || ventaAbierta(p); });
  errorAlerta = signal('');

  auth = inject(AuthService);
  estrellasTexto = estrellasTexto;

  stats = signal<StatsPelicula>({ promedio: null, cant: 0 });
  resenas = signal<Resena[]>([]);
  puedeResenar = signal(false);
  estrellas = signal(0);
  comentario = signal('');
  errorResena = signal('');
  guardandoResena = signal(false);
  editandoResena = signal(false);

  miResena = computed(() => this.resenas().find((r) => r.es_mia));
  otras = computed(() => this.resenas().filter((r) => !r.es_mia))


  acento = computed(() => {
    const n = this.pelicula()?.pelicula_generos[0]?.generos?.nombre;
    return n ? slug(n) : null;
  });

  dias = computed(() => {
    const mapa = new Map<string, string>();
    for (const f of this.funciones()) {
      const k = this.clave(f.inicio);
      if (!mapa.has(k)) {
        mapa.set(k, new Date(f.inicio).toLocaleDateString('es-AR', {
          weekday: 'short', day: '2-digit', month: '2-digit',
        }));
      }
    }
    return [...mapa].map(([clave, etiqueta]) => ({ clave, etiqueta }));
  });

  funcionesDia = computed(() => this.funciones().filter((f) => this.clave(f.inicio) === this.diaSel()));

  async ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    try {
      const p = id ? await this.peliculasSvc.una(id) : null;
      if (!p) {
        this.noExiste.set(true);
        return;
      }
      this.pelicula.set(p);
      this.canal = this.peliculasSvc.escucharCambios((fila) => {
        this.pelicula.update((actual) => (actual && actual.id === fila.id ? { ...actual, ...fila } : actual));
      });
      const funciones = await this.funcionesSvc.deLaPelicula(p.id);
      this.funciones.set(funciones);
      await this.cargarResenas(p.id);
      if (funciones.length) this.diaSel.set(this.clave(funciones[0].inicio));
    } finally {
      this.cargando.set(false);
    }
  }

  ngOnDestroy() {
    if (this.canal) this.peliculasSvc.dejarDeEscuchar(this.canal);
  }

  async alternarAlerta(id: string) {
    this.errorAlerta.set('');
    try { await this.alertas.alternar(id); }
    catch (e: any) { this.errorAlerta.set(e.message ?? 'No se pudo actualizar la alerta'); }
  }


  private clave(iso: string) {
    return new Date(iso).toLocaleDateString('en-CA');
  }

  hora(iso: string) {
    return new Date(iso).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
  }

   async cargarResenas(id: string) {
    await this.auth.listo;
    const [stats, lista, puede] = await Promise.all([
      this.resenasSvc.stats(id),
      this.resenasSvc.listar(id),
      this.auth.perfil() ? this.resenasSvc.puedeResenar(id) : Promise.resolve(false),
    ]);
    this.stats.set(stats);
    this.resenas.set(lista);
    this.puedeResenar.set(puede);
    const mia = lista.find((r) => r.es_mia);
    if (mia) {
      this.estrellas.set(mia.estrellas);
      this.comentario.set(mia.comentario ?? '');
    }
  }

  async guardarResena() {
    this.errorResena.set('');
    if (this.estrellas() < 1) return this.errorResena.set('Elegí cuántas estrellas le das');
    this.guardandoResena.set(true);
    try {
      const id = this.pelicula()!.id;
      await this.resenasSvc.guardar(this.auth.perfil()!.id, id, this.estrellas(), this.comentario().trim() || null);
      await this.cargarResenas(id);
      this.editandoResena.set(false);
    } catch (e: any) {
      this.errorResena.set(e.message ?? 'No se pudo guardar la reseña');
    } finally {
      this.guardandoResena.set(false);
    }
  }

  cancelarEdicion() {
    const mia = this.miResena();
    this.estrellas.set(mia?.estrellas ?? 0);
    this.comentario.set(mia?.comentario ?? '');
    this.errorResena.set('');
    this.editandoResena.set(false);
  }
}