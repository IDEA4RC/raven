import { Routes } from '@angular/router';


import { DataAnalysisComponent } from './data-analysis/data-analysis.component';
import { CreateAnalysisComponent } from './data-analysis/create-analysis/create-analysis.component';
import { IndividualDataAnalysisComponent } from './data-analysis/individual-data-analysis/individual-data-analysis.component';

export const AnalysisRoutes: Routes = [
  {
    path: '',
    children: [
      {
        path: 'data-analysis',
        component: DataAnalysisComponent,
        data: {
          title: 'Data Analysis',
          urls: [
            { title: 'Home', url: '/data-analysis/data-analysis' },
            { title: 'Data Analysis' },
          ],
        },
      },
      {
        path: 'new-analysis',
        component: CreateAnalysisComponent,
        data: {
          title: 'Data Analysis',
          urls: [
            { title: 'Home', url: '/data-analysis/new-analysis' },
            { title: 'New Analysis' },
          ],
        },
      },
      {
        path: ':id',
        component: IndividualDataAnalysisComponent,
        data: {
          title: 'Individual Data Analysis',
          urls: [
            { title: 'Home', url: '/workspace' },
            { title: 'My Workspace', url: '/workspace' },
            { title: 'Data Analysis' },
          ],
        },
      },
    ],
  },
];
// {
//         path: 'data-analysis/individual-data-analysis/:id',
//         component: IndividualDataAnalysisComponent,
//         data: {
//           title: 'Individual Data Analysis',
//           urls: [
//             { title: 'Home', url: '/workspace' },
//             { title: 'My Workspace', url: '/workspace' },
//             { title: 'Data Analysis' },
//           ],
//         },
//       },
