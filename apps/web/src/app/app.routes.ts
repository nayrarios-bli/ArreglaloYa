import { Routes } from '@angular/router';
import { HomePage } from './home-page.js';
import { RequestCreatePage } from './requests/request-create.page.js';

export const routes: Routes = [
  { path: '', component: HomePage, title: 'ArreglaloYa | Reparaciones en Cochabamba' },
  {
    path: 'solicitudes/nueva',
    component: RequestCreatePage,
    title: 'Publicar solicitud | ArreglaloYa',
  },
  { path: '**', redirectTo: '' },
];
