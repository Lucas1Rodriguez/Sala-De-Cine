import { Component, computed, input } from '@angular/core';

export interface ItemBarra {
  nombre: string;
  valor: number;
}

@Component({
  selector: 'app-barras',
  template: `
    @if (!items().length) {
      <p class="suave">{{ vacio() }}</p>
    } @else {
      <ol class="barras">
        @for (i of items(); track i.nombre) {
          <li>
            <span class="nom">{{ i.nombre }}</span>
            <span class="pista"><span class="relleno" [style.width.%]="ancho(i.valor)"></span></span>
            <strong class="num">{{ i.valor }}</strong>
          </li>
        }
      </ol>
    }
  `,
  styles: `
    .barras { list-style: none; margin: 0; padding: 0; display: grid; gap: 0.6rem; }
    li { display: grid; grid-template-columns: minmax(7rem, 11rem) 1fr 2.5rem; gap: 0.6rem; align-items: center; }
    .nom { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .pista { background: var(--borde); border-radius: 999px; height: 0.7rem; overflow: hidden; }
    .relleno { display: block; height: 100%; background: var(--primario); border-radius: 999px; }
    .num { text-align: right; }
  `,
})
export class Barras {
  items = input.required<ItemBarra[]>();
  vacio = input('Sin datos en este período');

  private max = computed(() => Math.max(1, ...this.items().map((i) => i.valor)));
  ancho(v: number) {
    return Math.max(3, (v / this.max()) * 100);
  }
}