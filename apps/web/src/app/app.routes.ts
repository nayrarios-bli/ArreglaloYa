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
    path: 'trabajador',
    canActivate: [authGuard, workerStatusGuard],
    data: { status: 'approved' },
    loadComponent: () =>
      import('./features/worker/pages/dashboard/dashboard').then(
        (module) => module.WorkerDashboard,
      ),
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
  {
    path: 'servicios/:serviceId/calificar',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/reviews/review-create.page').then(
        (module) => module.ReviewCreatePage,
      ),
    title: 'Calificar servicio | ArreglaloYa',
  },
  {
    path: 'reclamos',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/complaints/complaint-create.page').then(
        (module) => module.ComplaintCreatePage,
      ),
    title: 'Reclamos | ArreglaloYa',
  },
  {
    path: 'admin/reclamos',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/complaints/admin-complaints.page').then(
        (module) => module.AdminComplaintsPage,
      ),
    title: 'Reclamos registrados | ArreglaloYa',
  },
  {
    path: 'perfil/:id',
    loadComponent: () =>
      import('./features/profiles/public-profile.page').then(
        (module) => module.PublicProfilePage,
      ),
    title: 'Perfil | ArreglaloYa',
  },
  {
    path: 'mi-perfil',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/profiles/my-profile.page').then(
        (module) => module.MyProfilePage,
      ),
    title: 'Mi perfil | ArreglaloYa',
  },
  {
    path: 'admin/reportes',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/admin/admin-reports.page').then(
        (module) => module.AdminReportsPage,
      ),
    title: 'Reportes de administración | ArreglaloYa',
  },
  { path: '**', redirectTo: '' },
];
