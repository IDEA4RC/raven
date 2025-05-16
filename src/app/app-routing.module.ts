import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { BlankComponent } from './layouts/blank/blank.component';
import { FullComponent } from './layouts/full/full.component';
import { DataDiscoveryModule
  
 } from './pages/data-discovery/data-discovery.module';
import { WorkspaceModule } from './pages/workspace/workspace.module';
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
      //   path: 'material-table',
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
    path: '',
    component: FullComponent,
    children: [
      {
        path: '',
        loadChildren: () =>
          import('./pages/workspace/workspace.module').then(
            (m) => m.WorkspaceModule
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
