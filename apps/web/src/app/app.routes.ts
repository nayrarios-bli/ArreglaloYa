
import { Routes } from '@angular/router';

import { authGuard } from './core/auth.guard';
import { roleGuard } from './core/role.guard';
import { workerStatusGuard } from './core/worker-status.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./features/home/home').then(m => m.Home),
  },
  {
    path: 'registro',
    loadComponent: () =>
      import('./features/auth/pages/register/register').then(m => m.Register),
  },
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/pages/login/login').then(m => m.Login),
  },
  {
    path: 'prueba/hu-08',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/services/payment-test/payment-test')
        .then(m => m.PaymentTest),
    title: 'Prueba HU-08 | ArreglaloYa',
  },

  // Panel del cliente
  {
    path: 'cliente',
    canActivate: [authGuard, roleGuard],
    data: { role: 'client' },
    loadComponent: () =>
      import('./features/client/pages/dashboard/dashboard')
        .then(m => m.ClientDashboard),
  },

  // Panel del trabajador aprobado
  {
    path: 'trabajador',
    canActivate: [authGuard, workerStatusGuard],
    data: { status: 'approved' },
    loadComponent: () =>
      import('./features/worker/pages/dashboard/dashboard')
        .then(m => m.WorkerDashboard),
  },

  // Trabajador pendiente
  {
    path: 'trabajador/pendiente',
    canActivate: [authGuard, workerStatusGuard],
    data: { status: 'pending' },
    loadComponent: () =>
      import('./features/worker/pages/pending/pending')
        .then(m => m.WorkerPending),
  },

  // Trabajador rechazado
  {
    path: 'trabajador/rechazado',
    canActivate: [authGuard, workerStatusGuard],
    data: { status: 'rejected' },
    loadComponent: () =>
      import('./features/worker/pages/rejected/rejected')
        .then(m => m.WorkerRejected),
  },

  {
    path: '**',
    redirectTo: '',
  },
];
