import type { DiaReporte } from './reportes.service';
import { plata } from './utils';

export const fmtFecha = (s: string) => s.split('-').reverse().join('/');

export const totalesReporte = (dias: DiaReporte[]) => ({
  facturado: dias.reduce((s, d) => s + d.total_facturado, 0),
  cobrado: dias.reduce((s, d) => s + d.cobrado, 0),
  credito: dias.reduce((s, d) => s + d.credito_usado, 0),
  entradas: dias.reduce((s, d) => s + d.cant_entradas, 0),
  compras: dias.reduce((s, d) => s + d.cant_ordenes, 0),
  canjes: dias.reduce((s, d) => s + d.cant_canje, 0),
  puntos: dias.reduce((s, d) => s + d.puntos_canjeados, 0),
});

export const notaDia = (d: DiaReporte): string => {
  const partes: string[] = [];
  if (d.cant_canje > 0) {
    partes.push(
      `${d.cant_canje} ${d.cant_canje === 1 ? 'compra' : 'compras'} con canje por puntos (${d.puntos_canjeados} pts)`
    );
  }
  if (d.credito_usado > 0) partes.push(`${plata(d.credito_usado)} pagado con crédito`);
  return partes.join(' · ');
};