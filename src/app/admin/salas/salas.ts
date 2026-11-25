import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { SalasService } from '../../core/salas.service';
import { Butaca, Sala } from '../../core/models';

type Herramienta = 'bloquear' | 'normal' | 'vip' | 'accesible';

@Component({
  selector: 'app-admin-salas',
  imports: [],
  templateUrl: './salas.html',
  styleUrl: './salas.scss',
})
export class Salas implements OnInit {
  private svc = inject(SalasService);

  readonly herramientas: { id: Herramienta; label: string }[] = [
    { id: 'bloquear', label: 'Bloquear / habilitar' },
    { id: 'normal', label: 'Marcar común' },
    { id: 'vip', label: 'Marcar VIP' },
    { id: 'accesible', label: 'Marcar accesible' },
  ];

  salas = signal<Sala[]>([]);
  salaSel = signal<Sala | null>(null);
  butacas = signal<Butaca[]>([]);
  herramienta = signal<Herramienta>('bloquear');
  nuevoNombre = signal('');
  error = signal('');
  ok = signal('');

  filas = computed(() => {
    const mapa = new Map<string, Butaca[][]>();
    for (const b of this.butacas()) {
      if (!mapa.has(b.fila)) mapa.set(b.fila, [[], [], []]);
      mapa.get(b.fila)![b.sector - 1].push(b);
    }
    return [...mapa].map(([fila, sectores]) => ({ fila, sectores }));
  });
  bloqueadas = computed(() => this.butacas().filter((b) => !b.habilitada).length);

  async ngOnInit() {
    await this.cargar();
  }

  async cargar() {
    this.salas.set(await this.svc.listar());
  }

  private limpiar() {
    this.error.set('');
    this.ok.set('');
  }

  total(s: Sala) {
    return s.butacas[0]?.count ?? 0;
  }

  async crear() {
    this.limpiar();
    const n = this.nuevoNombre().trim();
    if (!n) return this.error.set('Escribí el nombre de la sala');
    try {
      await this.svc.crear(n);
      this.nuevoNombre.set('');
      this.ok.set(`${n} creada con su distribución de butacas`);
      await this.cargar();
    } catch (e: any) {
      this.error.set(e.message?.includes('duplicate') ? 'Ya existe una sala con ese nombre' : e.message);
    }
  }

  async renombrar(s: Sala, nombre: string) {
    this.limpiar();
    nombre = nombre.trim();
    if (!nombre || nombre === s.nombre) return this.cargar();
    try {
      await this.svc.actualizar(s.id, { nombre });
      this.ok.set('Nombre actualizado');
    } catch (e: any) {
      this.error.set(e.message?.includes('duplicate') ? 'Ya existe una sala con ese nombre' : e.message);
    }
    await this.cargar();
  }

  async alternarActiva(s: Sala) {
    await this.svc.actualizar(s.id, { activa: !s.activa });
    await this.cargar();
  }

  async abrir(s: Sala) {
    this.limpiar();
    this.salaSel.set(s);
    this.butacas.set(await this.svc.butacas(s.id));
  }

  cerrar() {
    this.salaSel.set(null);
    this.cargar();
  }

  deLaFila(r: { sectores: Butaca[][] }) {
    return r.sectores.flat();
  }

  async aplicar(lista: Butaca[]) {
    this.limpiar();
    const h = this.herramienta();
    const campos: Partial<Pick<Butaca, 'tipo' | 'habilitada'>> = h === 'bloquear' ? { habilitada: !lista.some((b) => b.habilitada) } : { tipo: h };
    const ids = new Set(lista.map((b) => b.id));
    const previo = this.butacas();
    this.butacas.set(previo.map((b) => (ids.has(b.id) ? { ...b, ...campos } : b)));
    try {
      await this.svc.actualizarButacas([...ids], campos);
    } catch (e: any) {
      this.butacas.set(previo);
      this.error.set(e.message ?? 'No se pudo guardar el cambio');
    }
  }

  nombreButaca(b: Butaca) {
    return `${b.fila}${b.numero}`;
  }

  tipoTexto(b: Butaca) {
    return b.tipo === 'vip' ? 'VIP' : b.tipo === 'accesible' ? 'Accesible' : 'Común';
  }
}