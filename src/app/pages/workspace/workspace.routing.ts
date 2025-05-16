import { Routes } from '@angular/router';

import { WorkspaceComponent } from './workspace.component';
export const WorkspaceRoutes: Routes = [
  {
    path: '',
    children: [
      {
        path: 'workspace',
        component: WorkspaceComponent,
        data: {
          title: 'My Workspace',
          urls: [
            { title: 'Home', url: '/workspace' },
            { title: 'My Workspace' },
          ],
        },
      },
    ],
  },
];