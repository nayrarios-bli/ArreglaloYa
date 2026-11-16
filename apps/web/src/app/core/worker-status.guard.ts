
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

export const workerStatusGuard: CanActivateFn = (route) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const user = authService.getUser();
  const expectedStatus = route.data['status'];

  if (!user) {
    return router.createUrlTree(['/login']);
  }

  if (user.role !== 'worker') {
    if (user.role === 'client') {
      return router.createUrlTree(['/cliente']);
    }

    return router.createUrlTree(['/login']);
  }

  if (user.reviewStatus === expectedStatus) {
    return true;
  }

  if (user.reviewStatus === 'pending') {
    return router.createUrlTree(['/trabajador/pendiente']);
  }

  if (user.reviewStatus === 'approved') {
    return router.createUrlTree(['/trabajador']);
  }

  if (user.reviewStatus === 'rejected') {
    return router.createUrlTree(['/trabajador/rechazado']);
  }

  return router.createUrlTree(['/login']);
};
