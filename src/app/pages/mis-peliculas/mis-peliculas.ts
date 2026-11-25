import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { HistorialService, PeliculaVista } from '../../core/historial.service';
import { estrellasTexto } from '../../core/utils';

@Component({
  selector: 'app-mis-peliculas',
  imports: [RouterLink],
  templateUrl: './mis-peliculas.html',
  styleUrl: './mis-peliculas.scss',
})
export class MisPeliculas implements OnInit {
  private svc = inject(HistorialService);
  private auth = inject(AuthService);

  peliculas = signal<PeliculaVista[]>([]);
  cargando = signal(true);
  error = signal('');
  estrellas = estrellasTexto;

  async ngOnInit() {
    await this.auth.listo;
    const uid = this.auth.perfil()?.id;
    if (!uid) return;
    try {
      this.peliculas.set(await this.svc.vistas(uid));
    } catch (e: any) {
      this.error.set(e.message ?? 'No se pudo cargar tu historial');
    } finally {
      this.cargando.set(false);
    }
  }

  fecha(iso: string) {
    return new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' });
  }
}