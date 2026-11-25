import { Component, OnInit, inject, signal } from '@angular/core';
import { RecompensasService } from '../../core/recompensas.service';
import { ProductosService } from '../../core/productos.service';
import { Producto, Recompensa } from '../../core/models';

@Component({
  selector: 'app-admin-recompensas',
  imports: [],
  templateUrl: './recompensas.html',
  styleUrl: './recompensas.scss',
})
export class Recompensas implements OnInit {
  private svc = inject(RecompensasService);
  private productosSvc = inject(ProductosService);

  recompensas = signal<Recompensa[]>([]);
  productos = signal<Producto[]>([]);
  tipo = signal<'entrada' | 'producto'>('entrada');
  productoId = signal('');
  puntos = signal<number | null>(null);
  error = signal('');
  ok = signal('');

  async ngOnInit() {
    await this.cargar();
  }

  async cargar() {
    const [r, p] = await Promise.all([this.svc.todas(), this.productosSvc.activos()]);
    this.recompensas.set(r);
    this.productos.set(p);
  }

  nombre(r: Recompensa) {
    return r.tipo === 'entrada' ? 'Entrada gratis' : (r.productos?.nombre ?? 'Producto');
  }

  async crear() {
    this.error.set('');
    this.ok.set('');
    const pts = this.puntos();
    if (this.tipo() === 'producto' && !this.productoId()) return this.error.set('Elegí el producto');
    if (pts === null || !(pts > 0)) return this.error.set('Ingresá cuántos puntos cuesta');
    try {
      await this.svc.crear({
        tipo: this.tipo(),
        producto_id: this.tipo() === 'producto' ? this.productoId() : null,
        puntos_costo: Math.round(pts),
      });
      this.puntos.set(null);
      this.ok.set('Recompensa creada');
      await this.cargar();
    } catch (e: any) {
      this.error.set(e.message);
    }
  }

  async cambiarPuntos(r: Recompensa, valor: number) {
    this.error.set('');
    if (!(valor > 0)) {
      await this.cargar();
      return this.error.set('Los puntos tienen que ser mayores a 0');
    }
    await this.svc.actualizar(r.id, { puntos_costo: Math.round(valor) });
    this.ok.set(`${this.nombre(r)} ahora cuesta ${Math.round(valor)} puntos`);
    await this.cargar();
    
  }

  async alternar(r: Recompensa) {
    await this.svc.actualizar(r.id, { activa: !r.activa });
    await this.cargar();
  }

  async borrar(r: Recompensa) {
    this.error.set('');
    if (!confirm(`¿Eliminar la recompensa ${this.nombre(r)}?`)) return;
    try {
      await this.svc.eliminar(r.id);
      await this.cargar();
    } catch {
      this.error.set('No se puede eliminar: ya fue canjeada. Desactivala para que deje de aparecer.');
    }
  }
}