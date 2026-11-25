import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { OrdenesService } from '../../core/ordenes.service';
import { AuthService } from '../../core/auth.service';
import { OrdenDetalle } from '../../core/models';
import { qrDataUrl } from '../../core/qr';
import { descargarEntradaPdf } from '../../core/entrada-pdf';
import { agruparItems, plata, slug, textoItem } from '../../core/utils';

@Component({
  selector: 'app-entrada',
  imports: [RouterLink],
  templateUrl: './entrada.html',
  styleUrl: './entrada.scss',
})
export class Entrada implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private svc = inject(OrdenesService);
  auth = inject(AuthService);

  plata = plata;
  cargando = signal(true);
  error = signal('');
  orden = signal<OrdenDetalle | null>(null);
  qr = signal('');
  generando = signal(false);

  butacas = computed(() =>
    (this.orden()?.entradas ?? [])
      .filter((e) => e.estado !== 'reservada')
      .map((e) => `${e.butacas.fila}${e.butacas.numero}${e.butacas.tipo === 'vip' ? ' (VIP)' : ''}`)
      .join(', ')
  );

  genero = computed(() => this.orden()?.funciones.peliculas.pelicula_generos[0]?.generos.nombre ?? '');
  
  acento = computed(() => (this.genero() ? slug(this.genero()) : null));

  candy = computed(() =>
    agruparItems(this.orden()?.orden_items ?? []).map((i) => textoItem(i)).join(', ')
  );

  async ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    try {
      const o = id ? await this.svc.orden(id) : null;
      if (!o) {
        this.error.set('No encontramos esa entrada.');
        return;
      }
      if (o.estado === 'pendiente') {
        await this.router.navigate(['/pago', o.id]);
        return;
      }
      this.orden.set(o);
      if (o.estado === 'pagada') this.qr.set(await qrDataUrl(o.codigo, 300));
    } finally {
      this.cargando.set(false);
    }
  }

  fmt(iso: string) {
    return new Date(iso).toLocaleString('es-AR', {
      weekday: 'long', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
    });
  }

  async descargar() {
    this.generando.set(true);
    try {
      await descargarEntradaPdf(this.orden()!);
    } catch (e: any) {
      this.error.set('No se pudo generar el PDF: ' + (e.message ?? ''));
    } finally {
      this.generando.set(false);
    }
  }
}