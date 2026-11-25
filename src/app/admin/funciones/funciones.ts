import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { PeliculasService } from '../../core/peliculas.service';
import { FuncionesService, ResultadoCancelacion } from '../../core/funciones.service';
import { Funcion, Pelicula } from '../../core/models';
import { fmtCorta } from '../../core/utils';

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

@Component({
  selector: 'app-admin-funciones',
  imports: [],
  templateUrl: './funciones.html',
  styleUrl: './funciones.scss',
})
export class Funciones implements OnInit {
  private peliculasSvc = inject(PeliculasService);
  private svc = inject(FuncionesService);
  fmtCorta = fmtCorta;

  readonly diasSemana = [ { n: 1, l: 'Lun' }, { n: 2, l: 'Mar' }, { n: 3, l: 'Mié' }, { n: 4, l: 'Jue' }, { n: 5, l: 'Vie' }, { n: 6, l: 'Sáb' }, { n: 7, l: 'Dom' }, ];
  readonly horas = Array.from({ length: 13 }, (_, i) => i + 11);
  readonly minutos = [0, 15, 30, 45];
  readonly formatos = ['2D', '3D', '4D', '5D'];
  readonly idiomas = [ { v: 'castellano', l: 'Castellano' }, { v: 'subtitulada', l: 'Subtitulada' }, ];
  readonly rangos = [ { dias: 7, l: 'Próx. 7 días' }, { dias: 14, l: 'Próx. 2 semanas' }, { dias: 30, l: 'Próx. 30 días' }, ];

  peliculas = signal<Pelicula[]>([]);
  funciones = signal<Funcion[]>([]);

  peliculaId = signal('');
  dias = signal<number[]>([]);
  hora = signal<number | null>(null);
  minuto = signal(0);
  formato = signal('2D');
  idioma = signal('castellano');
  rango = signal<number | null>(null);
  precio = signal<number | null>(null);

  error = signal('');
  ok = signal('');
  resumenCancelacion = signal<ResultadoCancelacion | null>(null);
  guardando = signal(false);

  estreno = computed(() => this.peliculas().find((p) => p.id === this.peliculaId())?.fecha_estreno ?? null);

  desde = computed(() => {
    const hoy = iso(new Date());
    const e = this.estreno();
    return e && e > hoy ? e : hoy;
  });

  hasta = computed(() => {
    const [d, m, a] = this.desde().split('-').map(Number);
    return iso(new Date(d, m - 1, a + (this.rango() ?? 1) - 1));
  });

  estrenoFuturo = computed(() => {
    const e = this.estreno();
    return e && e > iso(new Date()) ? e : null;
  });

  resumen = computed(() => {
    if (!this.dias().length || this.hora() === null || !this.rango()) return '';
    const dias = this.diasSemana.filter((d) => this.dias().includes(d.n)).map((d) => d.l).join(', ');
    const hh = `${String(this.hora()).padStart(2, '0')}:${String(this.minuto()).padStart(2, '0')}`;
    return `${dias} a las ${hh} · ${this.formato()} · ${this.idioma()} · del ${this.desde()} al ${this.hasta()}`;
  });

  async ngOnInit() {
    this.peliculas.set(await this.peliculasSvc.listar());
    await this.cargar();
  }

  async cargar() {
    this.funciones.set(await this.svc.proximas());
  }

  toggleDia(n: number) {
    this.dias.update((l) => (l.includes(n) ? l.filter((x) => x !== n) : [...l, n]));
  }

  async crear() {
    this.error.set('');
    this.ok.set('');
    const precio = this.precio();
    if (!this.peliculaId()) return this.error.set('Elegí una película');
    if (!this.dias().length) return this.error.set('Elegí al menos un día de la semana');
    if (this.hora() === null) return this.error.set('Elegí la hora');
    if (!this.rango()) return this.error.set('Elegí durante cuánto tiempo se proyecta');
    if (precio === null || precio < 0) return this.error.set('Ingresá el precio de la entrada');

    this.guardando.set(true);
    try {
      await this.svc.crearProgramacion({
        pelicula: this.peliculaId(),
        dias: this.dias(),
        hora: `${String(this.hora()).padStart(2, '0')}:${String(this.minuto()).padStart(2, '0')}:00`,
        formato: this.formato(),
        idioma: this.idioma(),
        desde: this.desde(),
        hasta: this.hasta(),
        precio,
      });
      this.ok.set('Funciones creadas. Las salas se asignaron automáticamente.');
      await this.cargar();
    } catch (e: any) {
      this.error.set(e.message ?? 'No se pudieron crear las funciones');
    } finally {
      this.guardando.set(false);
    }
  }

  async cancelar(f: Funcion) {
    const motivo = prompt('Motivo de la cancelación (opcional, se le informa al cliente):');
    if (motivo === null) return;
    if (!confirm('Se cancela la función, se acredita el crédito a cada comprador y se liberan las butacas. ¿Continuar?')) return;
    this.error.set('');
    this.resumenCancelacion.set(null);
    try {
      this.resumenCancelacion.set(await this.svc.cancelar(f.id, motivo));
      await this.cargar();
    } catch (e: any) {
      this.error.set(e.message ?? 'No se pudo cancelar la función');
    }
  }

  async eliminar(f: Funcion) {
    if (!confirm('¿Eliminar esta función?')) return;
    try {
      await this.svc.eliminar(f.id);
      await this.cargar();
    } catch (e: any) {
        this.error.set('No se pudo borrar. Si la función tiene compras, usá "Cancelar función". (' + e.message + ')');
    }
  }

  fmt(iso: string) {
    return new Date(iso).toLocaleString('es-AR', {
      weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
    });
  }
}