import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

export const registradoGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  await auth.listo;
  return auth.esRegistrado() || inject(Router).createUrlTree(['/login']);
};

export const adminGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  await auth.listo;
  return auth.esAdmin() || inject(Router).createUrlTree(['/']);
};

export const staffGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  await auth.listo;
  return auth.esStaff() || inject(Router).createUrlTree(['/']);
};