import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { UsuariosService } from '../../core/usuarios.service';
import { AuthService } from '../../core/auth.service';
import { Rol, UsuarioLista } from '../../core/models';
import { normalizar } from '../../core/utils';

@Component({
  selector: 'app-admin-usuarios',
  imports: [],
  templateUrl: './usuarios.html',
  styleUrl: './usuarios.scss',
})
export class Usuarios implements OnInit {
  private svc = inject(UsuariosService);
  auth = inject(AuthService);

  readonly roles: Rol[] = ['cliente', 'empleado', 'admin'];
  readonly etiqueta: Record<Rol, string> = { cliente: 'Cliente', empleado: 'Empleado', admin: 'Administrador' };

  usuarios = signal<UsuarioLista[]>([]);
  busqueda = signal('');
  error = signal('');
  ok = signal('');

  visibles = computed(() => {
    const q = normalizar(this.busqueda());
    return this.usuarios().filter(
      (u) => !q || normalizar(`${u.nombre} ${u.apellido} ${u.email}`).includes(q)
    );
  });

  async ngOnInit() {
    await this.cargar();
  }

  async cargar() {
    this.usuarios.set(await this.svc.listar());
  }

  async cambiar(u: UsuarioLista, rol: Rol) {
    this.error.set('');
    this.ok.set('');
    if (rol === u.rol) return;
    if (rol === 'admin' && !confirm(`${u.nombre} ${u.apellido} va a tener acceso total al panel. ¿Confirmás?`)) {
      return this.cargar();
    }
    try {
      await this.svc.cambiarRol(u.id, rol);
      this.ok.set(`${u.nombre} ${u.apellido} ahora es ${this.etiqueta[rol].toLowerCase()}`);
    } catch (e: any) {
      this.error.set(e.message ?? 'No se pudo cambiar el rol');
    }
    await this.cargar();
  }
}