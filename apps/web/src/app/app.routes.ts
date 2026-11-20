import { Routes } from '@angular/router';
import { authGuard } from './core/auth.guard';
import { roleGuard } from './core/role.guard';
import { workerStatusGuard } from './core/worker-status.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./features/home/home').then((module) => module.Home),
  },
  {
    path: 'registro',
    loadComponent: () =>
      import('./features/auth/pages/register/register').then(
        (module) => module.Register,
      ),
  },
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/pages/login/login').then(
        (module) => module.Login,
      ),
  },
  {
    path: 'solicitudes/nueva',
    canActivate: [authGuard, roleGuard],
    data: { role: 'client' },
    loadComponent: () =>
      import('./requests/request-create.page.js').then(
        (module) => module.RequestCreatePage,
      ),
    title: 'Publicar solicitud | ArreglaloYa',
  },
  {
    path: 'cliente',
    canActivate: [authGuard, roleGuard],
    data: { role: 'client' },
    loadComponent: () =>
      import('./features/client/pages/dashboard/dashboard').then(
        (module) => module.ClientDashboard,
      ),
  },

  {
    path: 'trabajador/perfil',
    canActivate: [authGuard, roleGuard],
    data: { role: 'worker' },
    loadComponent: () =>
      import('./features/worker/pages/profile/profile').then(
        (module) => module.WorkerProfilePage,
      ),
    title: 'Completar perfil | ArreglaloYa',
  },

  {
    path: 'trabajador',
    canActivate: [authGuard, workerStatusGuard],
    data: { status: 'approved' },
    loadComponent: () =>
      import('./features/worker/pages/dashboard/dashboard').then(
        (module) => module.WorkerDashboard,
      ),
  },
  {
    path: 'trabajador/solicitudes/:requestId',
    canActivate: [authGuard, workerStatusGuard],
    data: { status: 'approved' },
    loadComponent: () =>
      import('./features/worker/pages/compatible-requests/request-detail').then(
        (module) => module.CompatibleRequestDetailPage,
      ),
    title: 'Detalle de solicitud | ArreglaloYa',
  },
  {
    path: 'trabajador/solicitudes',
    pathMatch: 'full',
    canActivate: [authGuard, workerStatusGuard],
    data: { status: 'approved' },
    loadComponent: () =>
      import('./features/worker/pages/compatible-requests/compatible-requests').then(
        (module) => module.CompatibleRequests,
      ),
    title: 'Solicitudes compatibles | ArreglaloYa',
  },
  {
    path: 'trabajador/pendiente',
    canActivate: [authGuard, workerStatusGuard],
    data: { status: 'pending' },
    loadComponent: () =>
      import('./features/worker/pages/pending/pending').then(
        (module) => module.WorkerPending,
      ),
  },
  {
    path: 'trabajador/rechazado',
    canActivate: [authGuard, workerStatusGuard],
    data: { status: 'rejected' },
    loadComponent: () =>
      import('./features/worker/pages/rejected/rejected').then(
        (module) => module.WorkerRejected,
      ),
  },
  { path: '**', redirectTo: '' },
];
