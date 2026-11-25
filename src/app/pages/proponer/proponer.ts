import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../core/auth.service';
import { ESTADOS, Propuesta, PropuestasService } from '../../core/propuestas.service';

@Component({
  selector: 'app-proponer',
  imports: [ReactiveFormsModule],
  templateUrl: './proponer.html',
  styleUrl: './proponer.scss',
})
export class Proponer implements OnInit {
  private svc = inject(PropuestasService);
  private auth = inject(AuthService);
  private fb = inject(FormBuilder);

  estados = ESTADOS;
  propuestas = signal<Propuesta[]>([]);
  tienePendiente = computed(() => this.propuestas().some((p) => p.estado === 'pendiente'));
  enviando = signal(false);
  error = signal('');
  ok = signal('');

  form = this.fb.nonNullable.group({
    titulo: ['', [Validators.required, Validators.maxLength(120), Validators.pattern(/\S/)]],
    descripcion: ['', [Validators.required, Validators.maxLength(1000), Validators.pattern(/\S/)]],
    motivo: ['', [Validators.required, Validators.maxLength(1000), Validators.pattern(/\S/)]],
  });

  async ngOnInit() {
    await this.auth.listo;
    await this.cargar();
  }

  async cargar() {
    const uid = this.auth.perfil()?.id;
    if (!uid) return;
    try {
      this.propuestas.set(await this.svc.mias(uid));
    } catch (e: any) {
      this.error.set(e.message ?? 'No se pudieron cargar tus propuestas');
    }
  }

  async enviar() {
    this.error.set('');
    this.ok.set('');
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.error.set('Completá los tres campos');
      return;
    }
    this.enviando.set(true);
    try {
      const v = this.form.getRawValue();
      await this.svc.crear(v.titulo, v.descripcion, v.motivo);
      this.form.reset();
      this.ok.set('¡Gracias! Recibimos tu propuesta y la vamos a revisar.');
      await this.cargar();
    } catch (e: any) {
      this.error.set(e.message ?? 'No se pudo enviar la propuesta');
    } finally {
      this.enviando.set(false);
    }
  }

  fecha(iso: string) {
    return new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' });
  }
}