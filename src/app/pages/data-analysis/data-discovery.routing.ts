import { Routes } from '@angular/router';


import { DataAnalysisComponent } from './data-analysis/data-analysis.component';

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
    ],
  },
];
