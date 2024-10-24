import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { BlankComponent } from './layouts/blank/blank.component';
import { FullComponent } from './layouts/full/full.component';

const routes: Routes = [
  {
    path: '',
    component: BlankComponent,
    children: [
      {
        path: '',
        redirectTo: '/authentication/landing',
        pathMatch: 'full',

      },
      {
        path: 'authentication',
        loadChildren: () =>
          import('./pages/authentication/authentication.module').then(
            (m) => m.AuthenticationModule
          ),
      },
    ],
  },
  {
    path: '',
    component: FullComponent,
    children: [
      // {
      //   path: 'starter',
      //   loadChildren: () =>
      //     import('./pages/pages.module').then((m) => m.PagesModule),
      // },
      {
        path: 'discovery',
        loadChildren: () =>
          import('./pages/data-discovery/data-discovery.module').then(
            (m) => m.DataDiscoveryModule
          ),
      },
    ],
  },
  
  {
    path: '**',
    redirectTo: 'authentication/error',
  },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
