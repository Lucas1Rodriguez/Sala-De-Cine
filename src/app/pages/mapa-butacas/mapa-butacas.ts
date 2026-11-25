import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ButacasService } from '../../core/butacas.service';
import { ProductosService } from '../../core/productos.service';
import { CombosService } from '../../core/combos.service';
import { AuthService } from '../../core/auth.service';
import { Butaca, Categoria, Combo, FuncionDetalle, Producto } from '../../core/models';

const MAX_BUTACAS = 8;
const MAX_POR_PRODUCTO = 20;

@Component({
  selector: 'app-mapa-butacas',
  imports: [RouterLink],
  templateUrl: './mapa-butacas.html',
  styleUrl: './mapa-butacas.scss',
})
export class MapaButacas implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private svc = inject(ButacasService);
  private productosSvc = inject(ProductosService);
  private combosSvc = inject(CombosService);
  auth = inject(AuthService);

  cargando = signal(true);
  funcion = signal<FuncionDetalle | null>(null);
  butacas = signal<Butaca[]>([]);
  ocupadas = signal<Set<string>>(new Set());
  seleccion = signal<string[]>([]);
  recargo = signal(0);
  email = signal('');
  error = signal('');
  aviso = signal('');
  reservando = signal(false);
  precioBase = signal(0);
  enPreventa = computed(() => this.precioBase() !== (this.funcion()?.precio_base ?? 0));
  private dejarDeEscuchar?: () => void;

  // Candy y combos
  categorias = signal<Categoria[]>([]);
  productos = signal<Producto[]>([]);
  combos = signal<Combo[]>([]);
  catSel = signal<number | null>(null);
  cantidades = signal<Record<string, number>>({});
  cantCombos = signal<Record<string, number>>({});

  filas = computed(() => {
    const mapa = new Map<string, Butaca[][]>();
    for (const b of this.butacas()) {
      if (!mapa.has(b.fila)) mapa.set(b.fila, [[], [], []]);
      mapa.get(b.fila)![b.sector - 1].push(b);
    }
    return [...mapa].map(([fila, sectores]) => ({ fila, sectores }));
  });

  seleccionadas = computed(() => {
    const ids = new Set(this.seleccion());
    return this.butacas().filter((b) => ids.has(b.id));
  });
  totalButacas = computed(() => this.seleccionadas().reduce((s, b) => s + this.precio(b), 0));
  hayVip = computed(() => this.seleccionadas().some((b) => b.tipo === 'vip'));

  productosVisibles = computed(() =>
    this.productos().filter((p) => this.catSel() === null || p.categoria_id === this.catSel())
  );
  items = computed(() =>
    this.productos()
      .filter((p) => (this.cantidades()[p.id] ?? 0) > 0)
      .map((p) => ({ producto: p, cantidad: this.cantidades()[p.id] }))
  );
  totalCandy = computed(() => this.items().reduce((s, i) => s + i.producto.precio * i.cantidad, 0));

  combosElegidos = computed(() =>
    this.combos()
      .filter((c) => (this.cantCombos()[c.id] ?? 0) > 0)
      .map((c) => ({ combo: c, cantidad: this.cantCombos()[c.id] }))
  );
  
  combosConEntrada = computed(() =>
    this.combosElegidos().filter((c) => c.combo.incluye_entrada).reduce((s, c) => s + c.cantidad, 0)
  );
  
  totalCombos = computed(() => {
    const base = this.precioBase();
    return this.combosElegidos().reduce(
      (s, c) => s + (c.combo.incluye_entrada ? c.combo.precio - base : c.combo.precio) * c.cantidad,
      0
    );
  });
  total = computed(() => this.totalButacas() + this.totalCandy() + this.totalCombos());

  async ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    try {
      const f = id ? await this.svc.funcion(id) : null;
      if (!f) return;
      this.funcion.set(f);
      this.precioBase.set(await this.svc.precioVigente(f.id));
      const [butacas, ocupadas, recargo, categorias, productos, combos] = await Promise.all([
        this.svc.butacas(f.sala_id),
        this.svc.ocupadas(f.id),
        this.svc.recargoVip(),
        this.productosSvc.categorias(),
        this.productosSvc.activos(),
        this.combosSvc.activos(),
      ]);
      this.butacas.set(butacas);
      this.ocupadas.set(ocupadas);
      this.recargo.set(recargo);
      this.categorias.set(categorias);
      this.productos.set(productos);
      this.combos.set(combos);
      this.dejarDeEscuchar = this.svc.escuchar(f.id, (tipo, butacaId) => this.alCambiar(tipo, butacaId));
    } finally {
      this.cargando.set(false);
    }
  }

  ngOnDestroy() {
    this.dejarDeEscuchar?.();
  }

  private alCambiar(tipo: 'add' | 'remove', id: string) {
    this.ocupadas.update((s) => {
      const n = new Set(s);
      if (tipo === 'add') n.add(id);
      else n.delete(id);
      return n;
    });
    if (tipo === 'add' && this.seleccion().includes(id) && !this.reservando()) {
      this.seleccion.update((l) => l.filter((x) => x !== id));
      this.aviso.set('Alguien acaba de ocupar una de tus butacas y la sacamos de tu selección.');
      this.ajustarCombos();
    }
  }

  precio(b: Butaca) {
    const base = this.precioBase();
    return b.tipo === 'vip' ? Math.round(base * (1 + this.recargo() / 100) * 100) / 100 : base;
  }

  plata(n: number) {
    return n.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });
  }

  esOcupada(b: Butaca) {
    return this.ocupadas().has(b.id) || !b.habilitada;
  }

  esSeleccionada(b: Butaca) {
    return this.seleccion().includes(b.id);
  }

  toggle(b: Butaca) {
    if (this.esOcupada(b)) return;
    this.aviso.set('');
    this.error.set('');
    if (this.esSeleccionada(b)) {
      this.seleccion.update((l) => l.filter((x) => x !== b.id));
      this.ajustarCombos();
    } else if (this.seleccion().length >= MAX_BUTACAS) {
      this.aviso.set(`Podés elegir hasta ${MAX_BUTACAS} butacas por compra.`);
    } else {
      this.seleccion.update((l) => [...l, b.id]);
    }
  }

  private ajustarCombos() {
    let exceso = this.combosConEntrada() - this.seleccion().length;
    if (exceso <= 0) return;
    const nuevo = { ...this.cantCombos() };
    for (const c of this.combos().filter((x) => x.incluye_entrada)) {
      const quitar = Math.min(nuevo[c.id] ?? 0, exceso);
      nuevo[c.id] = (nuevo[c.id] ?? 0) - quitar;
      exceso -= quitar;
      if (exceso <= 0) break;
    }
    this.cantCombos.set(nuevo);
    this.aviso.set('Quitamos combos con entrada porque cada uno necesita una butaca.');
  }

  cantidad(p: Producto) {
    return this.cantidades()[p.id] ?? 0;
  }

  cambiarCantidad(p: Producto, delta: number) {
    const nueva = Math.min(MAX_POR_PRODUCTO, Math.max(0, this.cantidad(p) + delta));
    this.cantidades.update((c) => ({ ...c, [p.id]: nueva }));
  }

  cantidadCombo(c: Combo) {
    return this.cantCombos()[c.id] ?? 0;
  }

  cambiarCombo(c: Combo, delta: number) {
    if (delta > 0 && c.incluye_entrada && this.combosConEntrada() >= this.seleccion().length) {
      this.aviso.set('Cada combo con entrada necesita una butaca: elegí más butacas para sumar otro.');
      return;
    }
    this.aviso.set('');
    const nueva = Math.min(MAX_POR_PRODUCTO, Math.max(0, this.cantidadCombo(c) + delta));
    this.cantCombos.update((m) => ({ ...m, [c.id]: nueva }));
  }

  detalleCombo(c: Combo) {
    const productos = c.combo_items.map((i) => `${i.cantidad} ${i.productos.nombre}`).join(' + ');
    return c.incluye_entrada ? `Entrada + ${productos}` : productos;
  }

  nombre(b: Butaca) {
    return `${b.fila}${b.numero}`;
  }

  tipoTexto(b: Butaca) {
    return b.tipo === 'vip' ? 'VIP' : b.tipo === 'accesible' ? 'Accesible' : 'Común';
  }

  fmt(iso: string) {
    return new Date(iso).toLocaleString('es-AR', {
      weekday: 'long', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
    });
  }

  async reservar() {
    this.error.set('');
    if (!this.seleccion().length) return this.error.set('Elegí al menos una butaca');
    const email = this.auth.perfil()?.email ?? this.email().trim();
    if (!/^\S+@\S+\.\S+$/.test(email)) return this.error.set('Ingresá un email válido para enviarte la entrada');

    this.reservando.set(true);
    try {
      await this.auth.asegurarSesion();
      const items = this.items().map((i) => ({ producto_id: i.producto.id, cantidad: i.cantidad }));
      const combos = this.combosElegidos().map((c) => ({ combo_id: c.combo.id, cantidad: c.cantidad }));
      const orden = await this.svc.reservar(this.funcion()!.id, this.seleccion(), email, items, combos);
      await this.router.navigate(['/pago', orden]);
    } catch (e: any) {
      this.error.set(e.message ?? 'No se pudo reservar');
    } finally {
      this.reservando.set(false);
    }
  }
}