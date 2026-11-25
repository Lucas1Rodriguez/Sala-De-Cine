import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth.service';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);

  error = signal('');
  cargando = signal(false);

  form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  async enviar() {
    this.error.set('');
    if (this.form.invalid) return;
    const { email, password } = this.form.getRawValue();
    this.cargando.set(true);
    try {
      await this.auth.login(email, password);
      await this.router.navigate(['/']);
    } catch {
      this.error.set('Email o contraseña incorrectos');
    } finally {
      this.cargando.set(false);
    }
  }
}