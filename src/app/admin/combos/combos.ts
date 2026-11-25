import { Component, OnInit, inject, signal } from '@angular/core';
import { CombosService } from '../../core/combos.service';
import { ProductosService } from '../../core/productos.service';
import { Combo, Producto } from '../../core/models';
import { plata } from '../../core/utils';

@Component({
  selector: 'app-admin-combos',
  imports: [],
  templateUrl: './combos.html',
  styleUrl: './combos.scss',
})
export class Combos implements OnInit {
  private svc = inject(CombosService);
  private productosSvc = inject(ProductosService);

  plata = plata;
  combos = signal<Combo[]>([]);
  productos = signal<Producto[]>([]);
  nombre = signal('');
  descripcion = signal('');
  precio = signal<number | null>(null);
  cantidades = signal<Record<string, number>>({});
  error = signal('');
  ok = signal('');
  incluyeEntrada = signal(true);

  async ngOnInit() {
    await this.cargar();
  }

  async cargar() {
    const [c, p] = await Promise.all([this.svc.todos(), this.productosSvc.activos()]);
    this.combos.set(c);
    this.productos.set(p);
  }

  cantidad(p: Producto) {
    return this.cantidades()[p.id] ?? 0;
  }

  cambiar(p: Producto, delta: number) {
    const n = Math.max(0, this.cantidad(p) + delta);
    this.cantidades.update((c) => ({ ...c, [p.id]: n }));
  }

  detalle(c: Combo) {
    const productos = c.combo_items.map((i) => `${i.cantidad} ${i.productos.nombre}`).join(' + ');
    return c.incluye_entrada ? `Entrada + ${productos}` : `Solo candy: ${productos}`;
  }

  private limpiar() {
    this.error.set('');
    this.ok.set('');
  }

  async crear() {
    this.limpiar();
    const precio = this.precio();
    const items = this.productos()
      .filter((p) => this.cantidad(p) > 0)
      .map((p) => ({ producto_id: p.id, cantidad: this.cantidad(p) }));

    if (!this.nombre().trim()) return this.error.set('Ingresá el nombre del combo');
    if (!items.length) return this.error.set('Elegí al menos un producto para el combo');
    if (precio === null || !(precio > 0)) return this.error.set('Ingresá el precio del combo');

    try {
      await this.svc.crear(
        {
          nombre: this.nombre().trim(),
          descripcion: this.descripcion().trim() || null,
          precio,
          incluye_entrada: this.incluyeEntrada(),
        },
        items
      );
      this.incluyeEntrada.set(true);
      this.nombre.set('');
      this.descripcion.set('');
      this.precio.set(null);
      this.cantidades.set({});
      this.ok.set('Combo creado');
      await this.cargar();
    } catch (e: any) {
      this.error.set(e.message);
    }
  }

  async cambiarPrecio(c: Combo, valor: number) {
    this.limpiar();
    if (!(valor > 0)) {
      await this.cargar();
      return this.error.set('El precio no es válido');
    }
    await this.svc.actualizar(c.id, { precio: valor });
    this.ok.set(`${c.nombre} ahora cuesta ${plata(valor)}`);
    await this.cargar();
  }

  async alternar(c: Combo) {
    await this.svc.actualizar(c.id, { activo: !c.activo });
    await this.cargar();
  }

  async borrar(c: Combo) {
    this.limpiar();
    if (!confirm(`¿Eliminar el combo ${c.nombre}?`)) return;
    try {
      await this.svc.eliminar(c.id);
      await this.cargar();
    } catch {
      this.error.set('No se puede eliminar: ya se vendió. Desactivalo para que deje de aparecer.');
    }
  }
}