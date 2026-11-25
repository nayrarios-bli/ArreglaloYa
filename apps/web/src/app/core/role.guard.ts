
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

export const roleGuard: CanActivateFn = (route) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const user = authService.getUser();
  const expectedRole = route.data['role'];
  const allowedRoles = route.data['roles'] as string[] | undefined;

  if (!user) {
    return router.createUrlTree(['/login']);
  }

  const hasPermission = allowedRoles
    ? allowedRoles.includes(user.role)
    : user.role === expectedRole;

  if (hasPermission) {
    return true;
  }

  if (user.role === 'client') {
    return router.createUrlTree(['/cliente']);
  }

  if (user.role === 'worker') {
    if (user.reviewStatus === 'pending') {
      return router.createUrlTree(['/trabajador/pendiente']);
    }

    if (user.reviewStatus === 'approved') {
      return router.createUrlTree(['/trabajador']);
    }

    if (user.reviewStatus === 'rejected') {
      return router.createUrlTree(['/trabajador/rechazado']);
    }
  }

  if (user.role === 'admin' || user.role === 'superadmin') {
    return router.createUrlTree([
      user.role === 'superadmin' ? '/superadmin' : '/admin',
    ]);
  }

  return router.createUrlTree(['/login']);
};
