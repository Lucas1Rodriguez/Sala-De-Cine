export const normalizar = (s: string) =>
  s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

export const slug = (s: string) => normalizar(s).replace(/\s+/g, '-');

export const plata = (n: number) =>
  n.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0, maximumFractionDigits: 2 });

const COLORES_GENERO: Record<string, string> = {
  accion: '#ff7a3d', comedia: '#ffd23d', drama: '#b58cff', terror: '#ff3d5a',
  'ciencia-ficcion': '#3de0ff', animacion: '#4dffa6', romance: '#ff6fb1',
  suspenso: '#7a8cff', aventura: '#3dffd0', documental: '#c0c8d8',
};

export const colorGenero = (nombre: string) => COLORES_GENERO[slug(nombre)] ?? '#3de0ff';

export const hexARgb = (hex: string): [number, number, number] => [
  parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16),
];

export const estrellasTexto = (n: number) => '★'.repeat(n) + '☆'.repeat(5 - n);

export interface ItemOrden {
  cantidad: number;
  precio_unitario: number;
  productos: { nombre: string } | null;
  combos: { nombre: string } | null;
}

export interface ItemAgrupado {
  nombre: string;
  cantidad: number;
  canjeadas: number;
  importe: number;
}

export function agruparItems(items: ItemOrden[]): ItemAgrupado[] {
  const mapa = new Map<string, ItemAgrupado>();
  for (const i of items) {
    const nombre = i.productos?.nombre ?? i.combos?.nombre ?? 'Producto';
    const g = mapa.get(nombre) ?? { nombre, cantidad: 0, canjeadas: 0, importe: 0 };
    g.cantidad += i.cantidad;
    g.importe += i.cantidad * i.precio_unitario;
    if (i.precio_unitario === 0) g.canjeadas += i.cantidad;
    mapa.set(nombre, g);
  }
  return [...mapa.values()];
}

export const textoItem = (i: ItemAgrupado, por = '×') =>
  `${i.cantidad} ${por} ${i.nombre}${i.canjeadas ? ` (${i.canjeadas} con puntos)` : ''}`;

export const hoyAR = () =>
  new Date().toLocaleDateString('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' });

const restarDias = (fecha: string, dias: number) => {
  const [a, m, d] = fecha.split('-').map(Number);
  return new Date(Date.UTC(a, m - 1, d - dias)).toISOString().slice(0, 10);
};

export const aperturaVenta = (p: { fecha_estreno: string | null; preventa_dias: number | null }) =>
  p.fecha_estreno ? restarDias(p.fecha_estreno, p.preventa_dias ?? 0) : null;

export const ventaAbierta = (p: { fecha_estreno: string | null; preventa_dias: number | null }) => {
  const ap = aperturaVenta(p);
  return !ap || ap <= hoyAR();
};

export const fmtCorta = (fecha: string) => fecha.split('-').reverse().slice(0, 2).join('/');