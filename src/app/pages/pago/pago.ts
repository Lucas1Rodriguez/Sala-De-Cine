import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { OrdenesService } from '../../core/ordenes.service';
import { RecompensasService } from '../../core/recompensas.service';
import { AuthService } from '../../core/auth.service';
import { CalculoPago, Canje, OrdenDetalle, Recompensa } from '../../core/models';
import { agruparItems, plata } from '../../core/utils';

@Component({
  selector: 'app-pago',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './pago.html',
  styleUrl: './pago.scss',
})
export class Pago implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private svc = inject(OrdenesService);
  private recompSvc = inject(RecompensasService);
  private fb = inject(FormBuilder);
  auth = inject(AuthService);

  plata = plata;
  cargando = signal(true);
  motivoError = signal('');
  orden = signal<OrdenDetalle | null>(null);
  calculo = signal<CalculoPago | null>(null);
  recompensas = signal<Recompensa[]>([]);
  canjes = signal<Canje[]>([]);
  usarCredito = signal(false);
  error = signal('');
  errorCanje = signal('');
  pagando = signal(false);
  ahora = signal(Date.now());
  private timer?: ReturnType<typeof setInterval>;

  form = this.fb.nonNullable.group({
    titular: ['', Validators.required],
    tarjeta: ['', [Validators.required, Validators.pattern(/^(\d{4} ?){3}\d{4}$/)]],
    vencimiento: ['', [Validators.required, Validators.pattern(/^(0[1-9]|1[0-2])\/\d{2}$/)]],
    cvv: ['', [Validators.required, Validators.pattern(/^\d{3,4}$/)]],
  });

  entradas = computed(() => (this.orden()?.entradas ?? []).filter((e) => e.estado === 'reservada'));
  items = computed(() => agruparItems(this.orden()?.orden_items ?? []));

  venceEn = computed(() => {
    const t = this.entradas()
      .map((e) => (e.reservada_hasta ? new Date(e.reservada_hasta).getTime() : 0))
      .filter(Boolean);
    return t.length ? Math.min(...t) : 0;
  });
  segundos = computed(() => Math.max(0, Math.floor((this.venceEn() - this.ahora()) / 1000)));
  vencida = computed(() => !this.entradas().length || this.segundos() === 0);
  cuenta = computed(() => `${Math.floor(this.segundos() / 60)}:${String(this.segundos() % 60).padStart(2, '0')}`);

  disponibles = computed(() => (this.auth.perfil()?.puntos ?? 0) - (this.calculo()?.puntos_canjeados ?? 0));
  sinTarjeta = computed(() => this.calculo()?.a_pagar === 0);

  async ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    try {
      await this.auth.listo;
      const o = id ? await this.svc.orden(id) : null;
      if (!o) {
        this.motivoError.set('No encontramos esa compra.');
        return;
      }
      if (o.estado !== 'pendiente') {
        await this.router.navigate(['/entrada', o.id]);
        return;
      }
      this.orden.set(o);
      await this.recargar();
      if ((this.auth.perfil()?.credito ?? 0) > 0 && !this.usarCredito()) {
        await this.alternarCredito(true);
      }
      if (this.auth.perfil()) this.recompensas.set(await this.recompSvc.activas());
      this.timer = setInterval(() => this.ahora.set(Date.now()), 1000);
    } finally {
      this.cargando.set(false);
    }
  }

  ngOnDestroy() {
    clearInterval(this.timer);
  }

  async recargar() {
    const id = this.orden()!.id;
    const o = await this.svc.orden(id);
    if (o) this.orden.set(o);
    try {
      const c = await this.svc.calcular(id);
      this.calculo.set(c);
      this.usarCredito.set(c.usa_credito);
    } catch {
    }
    if (this.auth.perfil()) this.canjes.set(await this.svc.canjesPendientes(id));
  }

  nombreRecompensa(r: { tipo: string; productos: { nombre: string } | null }) {
    return r.tipo === 'entrada' ? 'Entrada gratis' : (r.productos?.nombre ?? 'Producto');
  }

  async canjear(r: Recompensa) {
    this.errorCanje.set('');
    try {
      await this.svc.canjear(this.orden()!.id, r.id);
      await this.recargar();
    } catch (e: any) {
      this.errorCanje.set(e.message ?? 'No se pudo canjear');
    }
  }

  async quitar(c: Canje) {
    this.errorCanje.set('');
    try {
      await this.svc.quitarCanje(c.id);
      await this.recargar();
    } catch (e: any) {
      this.errorCanje.set(e.message ?? 'No se pudo quitar el canje');
    }
  }

  async alternarCredito(usar: boolean) {
    this.errorCanje.set('');
    try {
      await this.svc.usarCredito(this.orden()!.id, usar);
      await this.recargar();
    } catch (e: any) {
      this.errorCanje.set(e.message ?? 'No se pudo aplicar el crédito');
    }
  }

  etiquetaCupon(c: CalculoPago) {
    return c.cupon_tipo === 'mayores_50' ? 'Cupón +50 años' : 'Cupón de bienvenida';
  }

  fmt(iso: string) {
    return new Date(iso).toLocaleString('es-AR', {
      weekday: 'long', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
    });
  }

  async pagar() {
    this.error.set('');
    if (this.vencida()) return;

    if (!this.sinTarjeta()) {
      const c = this.form.controls;
      if (c.titular.invalid) return this.error.set('Ingresá el nombre del titular');
      if (c.tarjeta.invalid) return this.error.set('El número de tarjeta debe tener 16 dígitos');
      if (c.vencimiento.invalid) return this.error.set('El vencimiento debe tener el formato MM/AA, por ejemplo 05/30');
      if (c.cvv.invalid) return this.error.set('El CVV debe tener 3 o 4 dígitos');

      const [mm, aa] = this.form.getRawValue().vencimiento.split('/').map(Number);
      if (new Date(2000 + aa, mm, 0, 23, 59, 59) < new Date()) {
        return this.error.set('La tarjeta está vencida');
      }
    }

    this.pagando.set(true);
    try {
      await new Promise((r) => setTimeout(r, 1200));
      const id = this.orden()!.id;
      await this.svc.pagar(id);
      await this.auth.cargarPerfil();
      await this.router.navigate(['/entrada', id]);
    } catch (e: any) {
      this.error.set(e.message ?? 'No se pudo procesar el pago');
    } finally {
      this.pagando.set(false);
    }
  }
}