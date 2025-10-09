import { Routes } from '@angular/router';

import { WorkspaceComponent } from './workspace.component';
import { IndividualWokspaceComponent } from './individual-wokspace/individual-wokspace.component';

export const WorkspaceRoutes: Routes = [
  {
    path: '',
    component: WorkspaceComponent,
    data: {
      title: 'My Workspace',
      urls: [
        { title: 'Home', url: '/workspace' },
        { title: 'My Workspace' },
      ],
    },
  },
  {
    path: ':id',
    component: IndividualWokspaceComponent,
    data: {
      title: 'Individual Workspace',
      urls: [
        { title: 'Home', url: '/workspace' },
        { title: 'My Workspace', url: '/workspace' },
        { title: 'Individual Workspace' },
      ],
    },
  },
];
// {
//     path: '',
//     children: [
//       {
//         path: 'workspace',
//         component: WorkspaceComponent,
//         data: {
//           title: 'My Workspace',
//           urls: [
//             { title: 'Home', url: '/workspace' },
//             { title: 'My Workspace' },
//           ],
//         },
//       },
//       {
//         path: 'workspace/:id',
//         component: IndividualWokspaceComponent,
//         data: {
//           title: 'Individual Workspace',
//           urls: [
//             { title: 'Home', url: '/workspace' },
//             { title: 'My Workspace', url: '/workspace' },
//             { title: 'Individual Workspace' },
//           ],
//         },
//       },
//     ],
//   },


// children: [
//           {
//             path: 'individual-workspace',
//             component: IndividualWokspaceComponent,
//             data: {
//               title: 'Individual Workspace',
//               urls: [
//                 { title: 'Home', url: '/workspace/individual-workspace' },
//                 { title: 'Individual Workspace' },
//               ],
//             },
//           }
//         ]
//       },
      