import { Component, OnInit, inject, signal } from '@angular/core';
import { CuponesService } from '../../core/cupones.service';
import { Cupon } from '../../core/models';

@Component({
  selector: 'app-admin-cupones',
  imports: [],
  templateUrl: './cupones.html',
  styleUrl: './cupones.scss',
})
export class Cupones implements OnInit {
  private svc = inject(CuponesService);

  cupones = signal<Cupon[]>([]);
  codigo = signal('');
  tipo = signal<'bienvenida' | 'mayores_50'>('mayores_50');
  porcentaje = signal<number | null>(null);
  error = signal('');
  ok = signal('');

  async ngOnInit() {
    await this.cargar();
  }

  async cargar() {
    this.cupones.set(await this.svc.listar());
  }

  etiqueta(t: string) {
    return t === 'bienvenida' ? 'Primera compra' : 'Mayores de 50';
  }

  async crear() {
    this.error.set('');
    this.ok.set('');
    const codigo = this.codigo().trim().toUpperCase();
    const pct = this.porcentaje();
    if (!codigo) return this.error.set('Ingresá un código para el cupón');
    if (pct === null || !(pct >= 1 && pct <= 100)) return this.error.set('El porcentaje tiene que estar entre 1 y 100');
    try {
      await this.svc.crear({ codigo, tipo: this.tipo(), porcentaje: pct });
      this.codigo.set('');
      this.porcentaje.set(null);
      this.ok.set('Cupón creado');
      await this.cargar();
    } catch (e: any) {
      this.error.set(e.message?.includes('duplicate') ? 'Ya existe un cupón con ese código' : e.message);
    }
  }

  async cambiarPorcentaje(c: Cupon, valor: number) {
    this.error.set('');
    this.ok.set('');
    if (!(valor >= 1 && valor <= 100)) {
      this.error.set('El porcentaje tiene que estar entre 1 y 100');
      await this.cargar();
      return;
    }
    await this.svc.actualizar(c.id, { porcentaje: valor });
    this.ok.set(`${c.codigo} ahora descuenta ${valor}%`);
    await this.cargar();
  }

  async alternar(c: Cupon) {
    await this.svc.actualizar(c.id, { activo: !c.activo });
    await this.cargar();
  }

  async eliminar(c: Cupon) {
    if (!confirm(`¿Eliminar el cupón ${c.codigo}?`)) return;
    try {
      await this.svc.eliminar(c.id);
      await this.cargar();
    } catch (e: any) {
      this.error.set('No se pudo eliminar si ya fue usado en una compra. Podés desactivarlo.');
    }
  }
}