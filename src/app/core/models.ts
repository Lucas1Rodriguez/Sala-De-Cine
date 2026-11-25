export type Rol = 'cliente' | 'empleado' | 'admin';

export interface Perfil {
  id: string;
  rol: Rol;
  email: string;
  nombre: string;
  apellido: string;
  fecha_nacimiento: string;
  tipo_sangre: string | null;
  color_ojos: string | null;
  dias_vacaciones: number | null;
  puntos: number;
  credito: number;
}

export interface RegistroDatos {
  email: string;
  password: string;
  nombre: string;
  apellido: string;
  fecha_nacimiento: string;
  tipo_sangre: string;
  color_ojos: string;
  dias_vacaciones: number;
}

export interface Genero {
  id: number;
  nombre: string;
}

export interface Pelicula {
  id: string;
  nombre: string;
  sinopsis: string;
  duracion_min: number;
  imagen_url: string | null;
  clasificacion_edad: number; // 0, 13 o 18
  publicada: boolean;
  fecha_estreno: string | null;
  preventa_dias: number;
  precio_preventa: number | null;
  pelicula_generos?: { genero_id: number }[];
}

export interface PeliculaCartelera extends Omit<Pelicula, 'pelicula_generos'> {
  pelicula_generos: { genero_id: number; generos: Genero }[];
}

export interface Funcion {
  id: string;
  pelicula_id: string;
  sala_id: string;
  inicio: string;
  fin: string;
  formato: '2D' | '3D' | '4D' | '5D';
  idioma: 'castellano' | 'subtitulada';
  precio_base: number;
  cancelada_at: string | null;
  peliculas: { nombre: string };
  salas: { nombre: string };
}

export type FuncionDePelicula = Omit<Funcion, 'peliculas'>;

export interface Butaca {
  id: string;
  sala_id: string;
  fila: string;
  numero: number;
  sector: number;
  tipo: 'normal' | 'accesible' | 'vip';
  habilitada: boolean;
}

export interface FuncionDetalle extends Omit<Funcion, 'peliculas'> {
  peliculas: { nombre: string; clasificacion_edad: number };
}

export interface Cupon {
  id: string;
  codigo: string;
  tipo: 'bienvenida' | 'mayores_50';
  porcentaje: number;
  activo: boolean;
}

export interface InfoCodigo {
  codigo: string;
  estado: 'pendiente' | 'pagada' | 'cancelada';
  pelicula: string;
  clasificacion_edad: number;
  inicio: string;
  sala: string;
  formato: string;
  idioma: string;
  butacas: string;
  tiene_candy: boolean;
  entrada_validada_at: string | null;
  candy_retirado_at: string | null;
}

export interface CalculoPago {
  subtotal: number;
  porcentaje: number;
  descuento: number;
  total: number;
  cupon_id: string | null;
  cupon_tipo: 'bienvenida' | 'mayores_50' | null;
  canjes: number;
  puntos_canjeados: number;
  usa_credito: boolean;
  credito_disponible: number;
  credito_aplicado: number;
  a_pagar: number;
}

export interface OrdenDetalle {
  id: string;
  estado: 'pendiente' | 'pagada' | 'cancelada';
  subtotal: number;
  descuento: number;
  total: number;
  codigo: string;
  email_contacto: string;
  puntos_ganados: number;
  entradas: {
    precio: number;
    estado: string;
    reservada_hasta: string | null;
    butacas: { fila: string; numero: number; tipo: 'normal' | 'accesible' | 'vip' };
  }[];
  orden_items: {
    cantidad: number;
    precio_unitario: number;
    productos: { nombre: string } | null;
    combos: { nombre: string } | null;
  }[];
  funciones: {
    id: string;
    inicio: string;
    formato: string;
    idioma: string;
    salas: { nombre: string };
    peliculas: {
      nombre: string;
      clasificacion_edad: number;
      pelicula_generos: { generos: { nombre: string } }[];
    };
  };
}

export interface Categoria {
  id: number;
  nombre: string;
}

export interface Producto {
  id: string;
  categoria_id: number | null;
  nombre: string;
  precio: number;
  activo: boolean;
}

export interface Combo {
  id: string;
  nombre: string;
  descripcion: string | null;
  precio: number;
  activo: boolean;
  incluye_entrada: boolean;
  combo_items: { cantidad: number; productos: { nombre: string } }[];
}

export interface Recompensa {
  id: string;
  tipo: 'entrada' | 'producto';
  producto_id: string | null;
  puntos_costo: number;
  activa: boolean;
  productos: { nombre: string } | null;
}

export interface Canje {
  id: string;
  puntos_gastados: number;
  valor: number;
  aplicado: boolean;
  created_at: string;
  recompensas: { tipo: 'entrada' | 'producto'; productos: { nombre: string } | null };
}

export interface CompraResumen {
  id: string;
  estado: 'pagada' | 'cancelada';
  total: number;
  codigo: string;
  created_at: string;
  entrada_validada_at: string | null;
  candy_retirado_at: string | null;
  funciones: { inicio: string; peliculas: { nombre: string } };
}

export interface Sala {
  id: string;
  nombre: string;
  activa: boolean;
  butacas: { count: number }[];
}

export interface UsuarioLista {
  id: string;
  email: string;
  nombre: string;
  apellido: string;
  rol: Rol;
}