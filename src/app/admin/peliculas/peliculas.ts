import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { PeliculasService } from '../../core/peliculas.service';
import { Genero, Pelicula } from '../../core/models';
import { slug } from '../../core/utils';
import { ActivatedRoute } from '@angular/router';
import { Propuesta, PropuestasService } from '../../core/propuestas.service';

@Component({
  selector: 'app-admin-peliculas',
  imports: [ReactiveFormsModule],
  templateUrl: './peliculas.html',
  styleUrl: './peliculas.scss',
})
export class Peliculas implements OnInit {
  private svc = inject(PeliculasService);
  private fb = inject(FormBuilder);
  private archivo: File | null = null;
  private route = inject(ActivatedRoute);
  private propuestasSvc = inject(PropuestasService);

  
  slug = slug;
  generos = signal<Genero[]>([]);
  peliculas = signal<Pelicula[]>([]);
  mostrandoForm = signal(false);
  editando = signal<Pelicula | null>(null);
  generosSel = signal<number[]>([]);
  previa = signal<string | null>(null);
  error = signal('');
  guardando = signal(false);
  propuestaOrigen = signal<Propuesta | null>(null);
  
  form = this.fb.nonNullable.group({
    nombre: ['', Validators.required],
    sinopsis: ['', Validators.required],
    duracion_min: [90, [Validators.required, Validators.min(1)]],
    clasificacion_edad: [0],
    publicada: [false],
    fecha_estreno: [''],
    precio_preventa: [null as number | null],
  });

  async ngOnInit() {
    this.generos.set(await this.svc.generos());
    await this.cargar();

    const idPropuesta = this.route.snapshot.queryParamMap.get('propuesta');
    if (idPropuesta) {
      const p = await this.propuestasSvc.una(idPropuesta);
      if (p && p.estado === 'pendiente') {
        this.nueva();
        this.form.patchValue({ nombre: p.titulo, sinopsis: p.descripcion });
        this.propuestaOrigen.set(p);
      } else {
        this.error.set('Esa propuesta ya fue resuelta o no existe');
      }
    }
  }

  async cargar() {
    this.peliculas.set(await this.svc.listar());
  }

  nueva() {
    this.propuestaOrigen.set(null);
    this.editando.set(null);
    this.form.reset();
    this.generosSel.set([]);
    this.archivo = null;
    this.previa.set(null);
    this.error.set('');
    this.mostrandoForm.set(true);
  }

  editar(p: Pelicula) {
    this.propuestaOrigen.set(null);
    this.editando.set(p);
    this.form.reset({
      nombre: p.nombre,
      sinopsis: p.sinopsis,
      duracion_min: p.duracion_min,
      clasificacion_edad: p.clasificacion_edad,
      publicada: p.publicada,
      fecha_estreno: p.fecha_estreno ?? '',
      precio_preventa: p.precio_preventa,
    });
    this.generosSel.set((p.pelicula_generos ?? []).map((g) => g.genero_id));
    this.archivo = null;
    this.previa.set(p.imagen_url);
    this.error.set('');
    this.mostrandoForm.set(true);
  }

  cerrar() {
    this.propuestaOrigen.set(null);
    this.mostrandoForm.set(false);
  }

  toggleGenero(id: number) {
    this.generosSel.update((l) => (l.includes(id) ? l.filter((x) => x !== id) : [...l, id]));
  }

  onArchivo(ev: Event) {
    const f = (ev.target as HTMLInputElement).files?.[0];
    if (!f) return;
    this.archivo = f;
    this.previa.set(URL.createObjectURL(f));
  }

  async guardar() {
    this.error.set('');
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.error.set('Completá nombre, sinopsis y duración');
      return;
    }
    if (!this.generosSel().length) {
      this.error.set('Elegí al menos un género');
      return;
    }
    this.guardando.set(true);
    try {
      const v = this.form.getRawValue();
      let imagen_url = this.editando()?.imagen_url ?? null;
      if (this.archivo) imagen_url = await this.svc.subirPoster(this.archivo);

      const peliculaId = await this.svc.guardar(
        {
          nombre: v.nombre,
          sinopsis: v.sinopsis,
          duracion_min: v.duracion_min,
          clasificacion_edad: v.clasificacion_edad,
          publicada: v.publicada,
          fecha_estreno: v.fecha_estreno || null,
          precio_preventa: v.precio_preventa,
          imagen_url,
        },
        this.generosSel(),
        this.editando()?.id
      );

      const origen = this.propuestaOrigen();
      if (origen && !this.editando()) {
        await this.propuestasSvc.resolver(origen.id, true, null, peliculaId);
      }

      await this.cargar();
      this.cerrar();
    } catch (e: any) {
      this.error.set(e.message ?? 'No se pudo guardar');
    } finally {
      this.guardando.set(false);
    }
  }

  async alternarPublicada(p: Pelicula) {
    await this.svc.actualizar(p.id, { publicada: !p.publicada });
    await this.cargar();
  }

  async eliminar(p: Pelicula) {
    if (!confirm(`¿Eliminar "${p.nombre}"?`)) return;
    try {
      await this.svc.eliminar(p.id);
      await this.cargar();
    } catch (e: any) {
      alert('No se pudo eliminar si tiene funciones programadas: ' + e.message);
    }
  }
}