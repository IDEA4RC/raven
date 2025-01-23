import { Routes } from '@angular/router';
import { StarterComponent } from './starter/starter.component';
import { LoginComponent } from './authentication/login/login.component';
import { MaterialTableComponent } from './material-table/material-table.component';

export const PagesRoutes: Routes = [
  // {
  //   path: '',
  //   component: LoginComponent,
  //   data: {
  //     title: 'Login Page',
  //   },
  // },
  // {
  //   path: '',
  //   component: StarterComponent,
  //   data: {
  //     title: 'Starter Page',
  //   },
  // },
  {
      path: '',
      children: [
        {
          path: '',
          component: MaterialTableComponent,
          data: {
            title: 'Metadata Search',
            urls: [
              { title: 'Home', url: '/material-table' },
              { title: 'Metadata Search' },
            ],
          },
        },
      ],
    },
];
