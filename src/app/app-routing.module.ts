import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { BlankComponent } from './layouts/blank/blank.component';
import { FullComponent } from './layouts/full/full.component';
import { DataDiscoveryModule
  
 } from './pages/data-discovery/data-discovery.module';
import { WorkspaceModule } from './pages/workspace/workspace.module';
const routes: Routes = [
  // Layout Routes for landing and authentication pages
  {
    path: '',
    component: BlankComponent,
    children: [
      { path: '', redirectTo: '/authentication/landing', pathMatch: 'full' },
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
      {
        path: 'workspace',
        loadChildren: () =>
          import('./pages/workspace/workspace.module').then(
            (m) => m.WorkspaceModule
          ),
      },
      {
        path: 'workspace/:id/data-discovery',
        loadChildren: () =>
          import('./pages/data-discovery/data-discovery.module').then(
            (m) => m.DataDiscoveryModule
          ),
      },
      {
        path: 'workspace/:id/data-analysis',
        loadChildren: () =>
          import('./pages/data-analysis/data-analysis.module').then(
            (m) => m.DataAnalysisModule
          ),
      },
      {
        path: 'discovery',
        loadChildren: () =>
          import('./pages/data-discovery/data-discovery.module').then(
            (m) => m.DataDiscoveryModule
          ),
      },
    ],
  },

  // Wildcard (404)
  { path: '**', redirectTo: 'authentication/error' },
  // {
  //   path: '',
  //   component: FullComponent,
  //   children: [
  //     // {
  //     //   path: 'material-table',
  //     //   loadChildren: () =>
  //     //     import('./pages/pages.module').then((m) => m.PagesModule),
  //     // },
  //     {
  //       path: 'discovery',
  //       loadChildren: () =>
  //         import('./pages/data-discovery/data-discovery.module').then(
  //           (m) => m.DataDiscoveryModule
  //         ),
  //     },
  //     {
  //       path: 'data-analysis',
  //       loadChildren: () =>
  //         import('./pages/data-analysis/data-analysis.module').then(
  //           (m) => m.DataAnalysisModule
  //         ),
  //     },
  //   ],
  // },
  // {
  //   path: '',
  //   component: FullComponent,
  //   children: [
  //     {
  //       path: '',
  //       loadChildren: () =>
  //         import('./pages/workspace/workspace.module').then(
  //           (m) => m.WorkspaceModule
  //         ),
  //     },
  //   ],
  // },
  
  
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
