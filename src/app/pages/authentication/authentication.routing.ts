import { Routes } from '@angular/router';


import { AppErrorComponent } from './error/error.component';
import { AppSideLoginComponent } from './side-login/side-login.component';
import { AppSideRegisterComponent } from './side-register/side-register.component';
import { LoginComponent } from './login/login.component';
import { LandingComponent } from './landing/landing.component';

export const AuthenticationRoutes: Routes = [
  {
    path: '',
    children: [
      
      {
        path: 'error',
        component: AppErrorComponent,
      },
      {
        path: 'side-login',
        component: AppSideLoginComponent,
      },
      {
        path: 'side-register',
        component: AppSideRegisterComponent,
      },
      {
        path: 'login',
        component: LoginComponent,
      },
      {
        path: 'landing',
        component: LandingComponent
      }
    ],
  },
];
