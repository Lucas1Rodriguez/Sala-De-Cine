import { Routes } from '@angular/router';
import { adminGuard, staffGuard, registradoGuard  } from './core/guards';

export const routes: Routes = [
  { path: '', loadComponent: () => import('./pages/home/home').then(m => m.Home) },
  { path: 'login', loadComponent: () => import('./pages/login/login').then(m => m.Login) },
  { path: 'registro', loadComponent: () => import('./pages/registro/registro').then(m => m.Registro) },
  {
    path: 'admin',
    canActivate: [adminGuard],
    loadComponent: () => import('./admin/admin-layout/admin-layout').then(m => m.AdminLayout),
    children: [
      { path: '', redirectTo: 'peliculas', pathMatch: 'full' },
      { path: 'peliculas', loadComponent: () => import('./admin/peliculas/peliculas').then(m => m.Peliculas) },
      { path: 'funciones', loadComponent: () => import('./admin/funciones/funciones').then(m => m.Funciones) },
      { path: 'cupones', loadComponent: () => import('./admin/cupones/cupones').then(m => m.Cupones) },
      { path: 'candy', loadComponent: () => import('./admin/candy/candy').then(m => m.Candy) },
      { path: 'combos', loadComponent: () => import('./admin/combos/combos').then(m => m.Combos) },
      { path: 'recompensas', loadComponent: () => import('./admin/recompensas/recompensas').then(m => m.Recompensas) },
      { path: 'salas', loadComponent: () => import('./admin/salas/salas').then(m => m.Salas) },
      { path: 'usuarios', loadComponent: () => import('./admin/usuarios/usuarios').then(m => m.Usuarios) },
      { path: 'reportes', loadComponent: () => import('./admin/reportes/reportes').then(m => m.Reportes) },
      { path: 'actividad', loadComponent: () => import('./admin/actividad/actividad').then(m => m.ActividadAdmin) },
      { path: 'propuestas', loadComponent: () => import('./admin/propuestas/propuestas').then(m => m.Propuestas) },
    ],
  },
  { path: 'pelicula/:id', loadComponent: () => import('./pages/pelicula-detalle/pelicula-detalle').then(m => m.PeliculaDetalle) },
  { path: 'funcion/:id', loadComponent: () => import('./pages/mapa-butacas/mapa-butacas').then(m => m.MapaButacas) },
  { path: 'validar', canActivate: [staffGuard], loadComponent: () => import('./empleado/validar/validar').then(m => m.Validar) },
  { path: 'pago/:id', loadComponent: () => import('./pages/pago/pago').then(m => m.Pago) },
  { path: 'entrada/:id', loadComponent: () => import('./pages/entrada/entrada').then(m => m.Entrada) },
  { path: 'perfil', canActivate: [registradoGuard], loadComponent: () => import('./pages/perfil/perfil').then(m => m.Perfil) },
  { path: 'mis-peliculas', canActivate: [registradoGuard], loadComponent: () => import('./pages/mis-peliculas/mis-peliculas').then(m => m.MisPeliculas) },
  { path: 'proponer', canActivate: [registradoGuard], loadComponent: () => import('./pages/proponer/proponer').then(m => m.Proponer) },
  { path: '**', redirectTo: '' },
];