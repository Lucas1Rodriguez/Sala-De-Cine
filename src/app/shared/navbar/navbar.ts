import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { Notificacion, NotificacionesService } from '../../core/notificaciones.service';

@Component({
  selector: 'app-navbar',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './navbar.html',
  styleUrl: './navbar.scss',
})
export class Navbar {
  auth = inject(AuthService);
  notif = inject(NotificacionesService);
  private router = inject(Router);

  abierta = signal(false);

  alternar() {
    this.abierta.update((v) => !v);
    if (this.abierta()) this.notif.recargar();
  }

  async elegirOtra(n: Notificacion) {
    await this.notif.marcarLeida(n);
    this.abierta.set(false);
    if (n.pelicula_id) this.router.navigate(['/pelicula', n.pelicula_id]);
  }

  fmt(iso: string) {
    return new Date(iso).toLocaleString('es-AR', {
      day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
    });
  }
}