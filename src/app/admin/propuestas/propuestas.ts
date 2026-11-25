import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ESTADOS, Propuesta, PropuestasService } from '../../core/propuestas.service';

@Component({
  selector: 'app-admin-propuestas',
  imports: [],
  templateUrl: './propuestas.html',
  styleUrl: './propuestas.scss',
})
export class Propuestas implements OnInit {
  private svc = inject(PropuestasService);
  private router = inject(Router);

  estados = ESTADOS;
  todas = signal<Propuesta[]>([]);
  pendientes = computed(() => this.todas().filter((p) => p.estado === 'pendiente'));
  resueltas = computed(() => this.todas().filter((p) => p.estado !== 'pendiente'));
  cargando = signal(true);
  error = signal('');

  async ngOnInit() {
    await this.cargar();
  }

  async cargar() {
    this.cargando.set(true);
    try {
      this.todas.set(await this.svc.todas());
    } catch (e: any) {
      this.error.set(e.message ?? 'No se pudieron cargar las propuestas');
    } finally {
      this.cargando.set(false);
    }
  }

  aceptar(p: Propuesta) {
    this.router.navigate(['/admin/peliculas'], { queryParams: { propuesta: p.id } });
  }

  async rechazar(p: Propuesta) {
    const motivo = prompt(`Motivo del rechazo de "${p.titulo}" (opcional, se le informa al cliente):`);
    if (motivo === null) return;
    this.error.set('');
    try {
      await this.svc.resolver(p.id, false, motivo || null);
      await this.cargar();
    } catch (e: any) {
      this.error.set(e.message ?? 'No se pudo rechazar la propuesta');
    }
  }

  fecha(iso: string) {
    return new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }
}