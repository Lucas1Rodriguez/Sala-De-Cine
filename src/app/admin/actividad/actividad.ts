import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Actividad, ActividadService } from '../../core/actividad.service';
import { plata } from '../../core/utils';

const ACCIONES: Record<string, string> = {
  crear_funcion: 'Creó una función',
  modificar_precio: 'Modificó un precio',
  validar_entrada: 'Validó una entrada',
  validar_candy: 'Entregó candy',
  compra: 'Compra',
  cancelar_compra: 'Canceló una compra',
  cancelar_funcion: 'Canceló una función',
  cambiar_rol: 'Cambió un rol',
  crear_propuesta: 'Envió una propuesta',
  resolver_propuesta: 'Resolvió una propuesta',
};

const DIAS = ['', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb', 'dom'];

@Component({
  selector: 'app-admin-actividad',
  imports: [],
  templateUrl: './actividad.html',
  styleUrl: './actividad.scss',
})
export class ActividadAdmin implements OnInit {
  private svc = inject(ActividadService);

  readonly acciones = Object.entries(ACCIONES).map(([id, label]) => ({ id, label }));

  filtro = signal<string | null>(null);
  items = signal<Actividad[]>([]);
  total = signal(0);
  cargando = signal(false);
  error = signal('');
  hayMas = computed(() => this.items().length < this.total());

  async ngOnInit() {
    await this.cargar(true);
  }

  async elegir(accion: string | null) {
    this.filtro.set(accion);
    await this.cargar(true);
  }

  async cargar(desdeCero: boolean) {
    this.cargando.set(true);
    this.error.set('');
    try {
      const desde = desdeCero ? 0 : this.items().length;
      const r = await this.svc.listar(this.filtro(), desde);
      this.items.set(desdeCero ? r.items : [...this.items(), ...r.items]);
      this.total.set(r.total);
    } catch (e: any) {
      this.error.set(e.message ?? 'No se pudo cargar la actividad');
    } finally {
      this.cargando.set(false);
    }
  }

  etiqueta(a: Actividad) {
    return ACCIONES[a.accion] ?? a.accion;
  }

  fecha(iso: string) {
    return new Date(iso).toLocaleString('es-AR', {
      day: '2-digit', month: '2-digit', year: '2-digit',
      hour: '2-digit', minute: '2-digit',
    });
  }

  detalle(a: Actividad): string {
    const d = a.detalle ?? {};
    switch (a.accion) {
      case 'modificar_precio':
        return `${a.entidad}: ${plata(Number(d['antes']))} → ${plata(Number(d['despues']))}`;
      case 'compra':
        return `Total ${plata(Number(d['total']))}`;
      case 'cancelar_compra':
        return `Crédito acreditado: ${plata(Number(d['credito']))}`;
      case 'cancelar_funcion':
        return `${d['acreditadas']} acreditados por ${plata(Number(d['monto']))}` +
          (d['anonimas'] ? ` · ${d['anonimas']} sin cuenta` : '') +
          (d['motivo'] ? ` · Motivo: ${d['motivo']}` : '');
      case 'cambiar_rol':
        return `${d['antes']} → ${d['despues']}`;
      case 'crear_funcion': {
        const dias = (d['dias'] as number[] | undefined)?.map((n) => DIAS[n]).join(', ');
        return `${dias ?? ''} a las ${String(d['hora'] ?? '').slice(0, 5)}`;
      }
      default:
        return '';
    }
  }
}