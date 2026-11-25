import { Component, OnInit, inject, signal } from '@angular/core';
import { ProductosService } from '../../core/productos.service';
import { Categoria, Producto } from '../../core/models';
import { plata } from '../../core/utils';

@Component({
  selector: 'app-admin-candy',
  imports: [],
  templateUrl: './candy.html',
  styleUrl: './candy.scss',
})
export class Candy implements OnInit {
  private svc = inject(ProductosService);

  plata = plata;
  categorias = signal<Categoria[]>([]);
  productos = signal<Producto[]>([]);
  nuevaCat = signal('');
  nombre = signal('');
  categoriaId = signal<number | null>(null);
  precio = signal<number | null>(null);
  error = signal('');
  ok = signal('');

  async ngOnInit() {
    await this.cargar();
  }

  async cargar() {
    const [c, p] = await Promise.all([this.svc.categorias(), this.svc.todos()]);
    this.categorias.set(c);
    this.productos.set(p);
  }

  nombreCat(id: number | null) {
    return this.categorias().find((c) => c.id === id)?.nombre ?? 'Sin categoría';
  }

  private limpiar() {
    this.error.set('');
    this.ok.set('');
  }

  async crearCategoria() {
    this.limpiar();
    const n = this.nuevaCat().trim();
    if (!n) return this.error.set('Escribí el nombre de la categoría');
    try {
      await this.svc.crearCategoria(n);
      this.nuevaCat.set('');
      await this.cargar();
    } catch (e: any) {
      this.error.set(e.message?.includes('duplicate') ? 'Esa categoría ya existe' : e.message);
    }
  }

  async borrarCategoria(c: Categoria) {
    this.limpiar();
    if (!confirm(`¿Eliminar la categoría ${c.nombre}?`)) return;
    try {
      await this.svc.eliminarCategoria(c.id);
      await this.cargar();
    } catch {
      this.error.set('No se puede eliminar una categoría que tiene productos.');
    }
  }

  async crearProducto() {
    this.limpiar();
    const precio = this.precio();
    if (!this.nombre().trim()) return this.error.set('Ingresá el nombre del producto');
    if (this.categoriaId() === null) return this.error.set('Elegí una categoría');
    if (precio === null || !(precio >= 0)) return this.error.set('Ingresá el precio');
    try {
      await this.svc.crear({ nombre: this.nombre().trim(), categoria_id: this.categoriaId(), precio });
      this.nombre.set('');
      this.precio.set(null);
      this.ok.set('Producto creado');
      await this.cargar();
    } catch (e: any) {
      this.error.set(e.message);
    }
  }

  async cambiarPrecio(p: Producto, valor: number) {
    this.limpiar();
    if (!(valor >= 0)) {
      await this.cargar();
      return this.error.set('El precio no es válido');
    }
    await this.svc.actualizar(p.id, { precio: valor });
    this.ok.set(`${p.nombre} ahora cuesta ${plata(valor)}`);
    await this.cargar();
  }

  async alternar(p: Producto) {
    await this.svc.actualizar(p.id, { activo: !p.activo });
    await this.cargar();
  }

  async borrar(p: Producto) {
    this.limpiar();
    if (!confirm(`¿Eliminar ${p.nombre}?`)) return;
    try {
      await this.svc.eliminar(p.id);
      await this.cargar();
    } catch {
      this.error.set('No se puede eliminar: ya se vendió. Desactivalo para que deje de aparecer.');
    }
  }
}