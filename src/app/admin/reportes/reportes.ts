import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ReportesService, DiaReporte, ItemRanking } from '../../core/reportes.service';
import { Barras } from '../../shared/barras/barras';
import { notaDia } from '../../core/reportes-datos';
import { exportarPdf } from '../../core/reporte-pdf';
import { exportarExcel } from '../../core/reporte-excel';
import { plata } from '../../core/utils';

type Rango = '7' | '30' | 'mes';

const iso = (d: Date) => d.toLocaleDateString('en-CA');

@Component({
  selector: 'app-admin-reportes',
  imports: [Barras],
  templateUrl: './reportes.html',
  styleUrl: './reportes.scss',
})
export class Reportes implements OnInit {
  private svc = inject(ReportesService);

  plata = plata;
  readonly rangos: { id: Rango; label: string }[] = [
    { id: '7', label: 'Últimos 7 días' },
    { id: '30', label: 'Últimos 30 días' },
    { id: 'mes', label: 'Este mes' },
  ];

  rango = signal<Rango>('7');
  dias = signal<DiaReporte[]>([]);
  productos = signal<ItemRanking[]>([]);
  semana = signal<ItemRanking[]>([]);
  mes = signal<ItemRanking[]>([]);
  cargando = signal(true);
  exportando = signal(false);
  error = signal('');

  nota = notaDia;
  totalCobrado = computed(() => this.dias().reduce((s, d) => s + d.cobrado, 0));
  totalCredito = computed(() => this.dias().reduce((s, d) => s + d.credito_usado, 0));
  totalCanjes = computed(() => this.dias().reduce((s, d) => s + d.cant_canje, 0));
  totalPuntos = computed(() => this.dias().reduce((s, d) => s + d.puntos_canjeados, 0));
  totalFacturado = computed(() => this.dias().reduce((s, d) => s + d.total_facturado, 0));
  totalEntradas = computed(() => this.dias().reduce((s, d) => s + d.cant_entradas, 0));
  totalOrdenes = computed(() => this.dias().reduce((s, d) => s + d.cant_ordenes, 0));
  maximo = computed(() => Math.max(1, ...this.dias().map((d) => d.total_facturado)));
  conVentas = computed(() => this.dias().filter((d) => d.cant_ordenes > 0).slice().reverse());

  async ngOnInit() {
    await Promise.all([this.cargar(), this.cargarPeliculas()]);
  }

  async elegir(r: Rango) {
    this.rango.set(r);
    await this.cargar();
  }

  private limites(): { desde: string; hasta: string } {
    const hoy = new Date();
    const desde = new Date(hoy);
    if (this.rango() === 'mes') desde.setDate(1);
    else desde.setDate(hoy.getDate() - (Number(this.rango()) - 1));
    return { desde: iso(desde), hasta: iso(hoy) };
  }

  async cargar() {
    this.cargando.set(true);
    this.error.set('');
    try {
      const { desde, hasta } = this.limites();
      const [dias, productos] = await Promise.all([
        this.svc.facturacion(desde, hasta),
        this.svc.productosMasVendidos(desde, hasta),
      ]);
      this.dias.set(dias);
      this.productos.set(productos);
    } catch (e: any) {
      this.error.set(e.message ?? 'No se pudo cargar el reporte');
    } finally {
      this.cargando.set(false);
    }
  }

  async cargarPeliculas() {
    try {
      const hoy = new Date();
      const hace6 = new Date(hoy);
      hace6.setDate(hoy.getDate() - 6);
      const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
      const [sem, mes] = await Promise.all([
        this.svc.peliculasMasVistas(iso(hace6), iso(hoy)),
        this.svc.peliculasMasVistas(iso(inicioMes), iso(hoy)),
      ]);
      this.semana.set(sem);
      this.mes.set(mes);
    } catch (e: any) {
      this.error.set(e.message ?? 'No se pudieron cargar las películas más vistas');
    }
  }

  async exportar(tipo: 'pdf' | 'excel') {
    this.exportando.set(true);
    this.error.set('');
    try {
      const { desde, hasta } = this.limites();
      if (tipo === 'pdf') await exportarPdf(this.dias(), desde, hasta);
      else await exportarExcel(this.dias(), desde, hasta);
    } catch (e: any) {
      this.error.set(e.message ?? 'No se pudo exportar el reporte');
    } finally {
      this.exportando.set(false);
    }
  }

  private fecha(s: string) {
    const [y, m, d] = s.split('-').map(Number);
    return new Date(y, m - 1, d);
  }

  diaCorto(s: string) {
    return this.fecha(s).getDate();
  }

  diaLargo(s: string) {
    return this.fecha(s).toLocaleDateString('es-AR', { weekday: 'long', day: '2-digit', month: '2-digit' });
  }

  alto(d: DiaReporte) {
    return Math.max(d.total_facturado > 0 ? 3 : 0, (d.total_facturado / this.maximo()) * 100);
  }
}