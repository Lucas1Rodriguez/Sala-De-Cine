import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-registro',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './registro.html',
  styleUrl: './registro.scss',
})
export class Registro {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);

  readonly dias = Array.from({ length: 31 }, (_, i) => i + 1);
  readonly meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  readonly anios = Array.from({ length: 100 }, (_, i) => new Date().getFullYear() - i);
  readonly tiposSangre = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
  readonly coloresOjos = ['Marrones', 'Negros', 'Verdes', 'Azules', 'Celestes', 'Grises', 'Avellana'];

  error = signal('');
  cargando = signal(false);

  form = this.fb.nonNullable.group({
    nombre: ['', Validators.required],
    apellido: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    dia: [0, Validators.min(1)],
    mes: [0, Validators.min(1)],
    anio: [0, Validators.min(1)],
    tipo_sangre: ['', Validators.required],
    color_ojos: ['', Validators.required],
    dias_vacaciones: [0, [Validators.required, Validators.min(0), Validators.max(365)]],
  });

  private fechaNacimiento(): string | null {
    const { dia, mes, anio } = this.form.getRawValue();
    const d = new Date(anio, mes - 1, dia);
    if (d.getFullYear() !== anio || d.getMonth() !== mes - 1 || d.getDate() !== dia) return null;
    if (d > new Date()) return null;
    return `${anio}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
  }

  async enviar() {
    this.error.set('');
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.error.set('Completá todos los campos');
      return;
    }
    const fecha = this.fechaNacimiento();
    if (!fecha) {
      this.error.set('La fecha de nacimiento no es válida');
      return;
    }
    const v = this.form.getRawValue();
    this.cargando.set(true);
    try {
      await this.auth.registrar({
        email: v.email,
        password: v.password,
        nombre: v.nombre,
        apellido: v.apellido,
        fecha_nacimiento: fecha,
        tipo_sangre: v.tipo_sangre,
        color_ojos: v.color_ojos,
        dias_vacaciones: v.dias_vacaciones,
      });
      await this.router.navigate(['/']);
    } catch (e: any) {
      this.error.set(e.message ?? 'No se pudo completar el registro');
    } finally {
      this.cargando.set(false);
    }
  }
}