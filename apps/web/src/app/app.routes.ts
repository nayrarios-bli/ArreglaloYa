
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
  path: 'admin/workers',
  canActivate: [authGuard, roleGuard],
  data: { roles: ['admin', 'superadmin'] },
  loadComponent: () =>
    import('./features/admin/pages/workers/workers').then(
      (module) => module.AdminWorkers,
    ),
  title: 'Revisión de trabajadores | ArreglaloYa',
},
  // Panel de administración - HU-12
  {
    path: 'admin',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['admin', 'superadmin'] },
    loadComponent: () =>
      import('./features/admin/pages/dashboard/dashboard').then(
        (module) => module.AdminDashboard,
      ),
    title: 'Panel de administración | ArreglaloYa',
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
    path: 'servicios/pagos',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['client', 'worker'] },
    loadComponent: () =>
      import('./features/services/payment-confirmation/payment-confirmation').then(
        (module) => module.PaymentConfirmation,
      ),
    title: 'Confirmación de pago | ArreglaloYa',
  },
  {
    path: 'servicios/:serviceId/horario',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['client', 'worker'] },
    loadComponent: () =>
      import('./features/services/schedule-agreement/schedule-agreement').then(
        (module) => module.ScheduleAgreement,
      ),
    title: 'Coordinar horario | ArreglaloYa',
  },
  {
    path: 'servicios',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['client', 'worker'] },
    loadComponent: () => import('./features/services/service-status-list/service-status-list').then((m) => m.ServiceStatusList),
    title: 'Mis servicios | ArreglaloYa',
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
    path: 'cliente/perfil',
    canActivate: [authGuard, roleGuard],
    data: { role: 'client' },
    loadComponent: () =>
      import('./features/profiles/pages/client-profile/client-profile').then(
        (module) => module.ClientProfile,
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
    path: 'trabajador/servicios/:serviceId/estado',
    canActivate: [authGuard, workerStatusGuard],
    data: { status: 'approved' },
    loadComponent: () =>
      import('./features/services/service-status-update/service-status-update').then(
        (m) => m.ServiceStatusUpdate,
      ),
    title: 'Actualizar servicio | ArreglaloYa',
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
{
    path: 'superadmin',
    canActivate: [authGuard, roleGuard],
    data: { role: 'superadmin' },
    loadComponent: () =>
      import('./features/superadmin/pages/admin-management/admin-management')
        .then((module) => module.AdminManagement),
    title: 'Gestión de administradores | ArreglaloYa',
  },
  {
    path: 'cliente/solicitudes/:requestId/ofertas',
    canActivate: [authGuard, roleGuard],
    data: { role: 'client' },
    loadComponent: () =>
      import('./features/offers/client-offers/client-offers.page.js').then(
        (module) => module.ClientOffersPage,
      ),
    title: 'Ofertas recibidas | ArreglaloYa',
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
  { path: '**', redirectTo: '' },
];
