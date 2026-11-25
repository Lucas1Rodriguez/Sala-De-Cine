import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { OrdenesService } from '../../core/ordenes.service';
import { Canje, CompraResumen } from '../../core/models';
import { plata } from '../../core/utils';

const DOS_HORAS = 2 * 60 * 60 * 1000;

@Component({
  selector: 'app-perfil',
  imports: [RouterLink],
  templateUrl: './perfil.html',
  styleUrl: './perfil.scss',
})
export class Perfil implements OnInit {
  auth = inject(AuthService);
  private svc = inject(OrdenesService);

  plata = plata;
  cargando = signal(true);
  compras = signal<CompraResumen[]>([]);
  canjes = signal<Canje[]>([]);
  cancelando = signal('');
  error = signal('');
  ok = signal('');

  async ngOnInit() {
    try {
      await this.cargar();
    } finally {
      this.cargando.set(false);
    }
  }

  async cargar() {
    const [compras, canjes] = await Promise.all([this.svc.misCompras(), this.svc.misCanjes()]);
    this.compras.set(compras);
    this.canjes.set(canjes);
  }

  nombreCanje(c: Canje) {
    return c.recompensas.tipo === 'entrada' ? 'Entrada gratis' : (c.recompensas.productos?.nombre ?? 'Producto');
  }

  puedeCancelar(c: CompraResumen) {
    return (
      c.estado === 'pagada' &&
      !c.entrada_validada_at &&
      !c.candy_retirado_at &&
      new Date(c.funciones.inicio).getTime() - Date.now() > DOS_HORAS
    );
  }

  limite(c: CompraResumen) {
    return this.hora(new Date(new Date(c.funciones.inicio).getTime() - DOS_HORAS).toISOString());
  }

  async cancelar(c: CompraResumen) {
    this.error.set('');
    this.ok.set('');
    const texto =
      `¿Cancelar la compra de "${c.funciones.peliculas.nombre}"?\n\n` +
      `No se devuelve dinero: se acreditan ${plata(c.total)} como crédito en tu cuenta. ` +
      `Los puntos que sumó esta compra se descuentan y los que canjeaste se te devuelven.`;
    if (!confirm(texto)) return;

    this.cancelando.set(c.id);
    try {
      const credito = await this.svc.cancelar(c.id);
      await this.auth.cargarPerfil();
      await this.cargar();
      this.ok.set(`Compra cancelada. Se acreditaron ${plata(credito)} a tu cuenta.`);
    } catch (e: any) {
      this.error.set(e.message ?? 'No se pudo cancelar la compra');
    } finally {
      this.cancelando.set('');
    }
  }

  fmt(iso: string) {
    return new Date(iso).toLocaleString('es-AR', {
      weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
    });
  }

  hora(iso: string) {
    return new Date(iso).toLocaleString('es-AR', {
      day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
    });
  }

  fmtDia(iso: string) {
    return new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }
}