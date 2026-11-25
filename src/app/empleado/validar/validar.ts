import { Component, ElementRef, OnDestroy, inject, signal, viewChild } from '@angular/core';
import { ValidacionService } from '../../core/validacion.service';
import { InfoCodigo } from '../../core/models';

@Component({
  selector: 'app-validar',
  imports: [],
  templateUrl: './validar.html',
  styleUrl: './validar.scss',
})
export class Validar implements OnDestroy {
  private svc = inject(ValidacionService);
  private video = viewChild<ElementRef<HTMLVideoElement>>('video');

  codigo = signal('');
  info = signal<InfoCodigo | null>(null);
  error = signal('');
  ok = signal('');
  buscando = signal(false);
  procesando = signal(false);
  camaraActiva = signal(false);
  camaraError = signal('');

  private stream?: MediaStream;
  private raf = 0;

  ngOnDestroy() {
    this.detenerCamara();
  }

  async iniciarCamara() {
    this.camaraError.set('');
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      const v = this.video()!.nativeElement;
      v.srcObject = this.stream;
      await v.play();
      this.camaraActiva.set(true);

      const jsQR = (await import('jsqr')).default;
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d', { willReadFrequently: true })!;

      const leer = () => {
        if (!this.camaraActiva()) return;
        if (v.readyState === v.HAVE_ENOUGH_DATA) {
          canvas.width = v.videoWidth;
          canvas.height = v.videoHeight;
          ctx.drawImage(v, 0, 0);
          const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const qr = jsQR(img.data, img.width, img.height);
          if (qr?.data) {
            this.detenerCamara();
            this.codigo.set(qr.data.trim().toUpperCase());
            this.buscar();
            return;
          }
        }
        this.raf = requestAnimationFrame(leer);
      };
      leer();
    } catch {
      this.detenerCamara();
      this.camaraError.set('No se pudo acceder a la cámara. Revisá el permiso del navegador o ingresá el código a mano.');
    }
  }

  detenerCamara() {
    cancelAnimationFrame(this.raf);
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = undefined;
    this.camaraActiva.set(false);
  }

  async buscar() {
    this.error.set('');
    this.ok.set('');
    this.info.set(null);
    const c = this.codigo().trim().toUpperCase();
    if (!c) return this.error.set('Escaneá o escribí un código');
    this.buscando.set(true);
    try {
      this.info.set(await this.svc.consultar(c));
    } catch (e: any) {
      this.error.set(e.message ?? 'No se pudo consultar el código');
    } finally {
      this.buscando.set(false);
    }
  }

  async validar(tipo: 'entrada' | 'candy') {
    this.error.set('');
    this.ok.set('');
    this.procesando.set(true);
    try {
      const codigo = this.info()!.codigo;
      await this.svc.validar(codigo, tipo);
      this.ok.set(tipo === 'entrada' ? 'Entrada validada ✓' : 'Candy entregado ✓');
      this.info.set(await this.svc.consultar(codigo));
    } catch (e: any) {
      this.error.set(e.message ?? 'No se pudo validar');
    } finally {
      this.procesando.set(false);
    }
  }

  nuevo() {
    this.codigo.set('');
    this.info.set(null);
    this.error.set('');
    this.ok.set('');
  }

  esHoy(i: InfoCodigo) {
    return new Date(i.inicio).toDateString() === new Date().toDateString();
  }

  fmt(iso: string) {
    return new Date(iso).toLocaleString('es-AR', {
      weekday: 'long', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
    });
  }

  hora(iso: string) {
    return new Date(iso).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
  }
}