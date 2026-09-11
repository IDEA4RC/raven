import { Routes } from '@angular/router';

import { ResultReportComponent } from './result-report/result-report.component';

export const ResultReportRoutes: Routes = [
  {
    path: '',
    component: ResultReportComponent,
    data: {
      title: 'Result Report',
      urls: [
        { title: 'Home', url: '/workspace' },
        { title: 'My Workspace', url: '/workspace' },
        { title: 'Result Report' },
      ],
    },
  },
];
