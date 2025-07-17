// src/app/auth.interceptor.ts

import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(private authService: AuthService) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const token = this.authService.getToken();
    // "eyJhbGciOiJSUzI1NiIsInR5cCIgOiAiSldUIiwia2lkIiA6ICJDUlV6ZzRyQU5xV0FuV2N6YmtrblRuSUpaNG5pLWlmdEZ6OEZVYW1YM0h3In0.eyJleHAiOjE3NTE5NjM1MjksImlhdCI6MTc1MTM1ODcyOSwianRpIjoiZjdjOWNiMWYtYWRhMS00ZGFjLWI2ODgtZTZiYTFlYjZlYzg5IiwiaXNzIjoiaHR0cHM6Ly9pZGVhNHJjLWtleWtsb2FrLmRldmVsb3BtZW50LWl0aS5jb20vcmVhbG1zL2lkZWE0cmMiLCJhdWQiOiJhY2NvdW50Iiwic3ViIjoiZTE0MGY2NzEtMjI0Ny00YzUzLWI3YmYtNmNlZmE2YWM2ZDM3IiwidHlwIjoiQmVhcmVyIiwiYXpwIjoicmF2ZW4iLCJzZXNzaW9uX3N0YXRlIjoiYTQ1ZjkwOTYtNDZiNi00N2UzLWI1YWMtZDAyMmE2ZDA4MDE4IiwiYWNyIjoiMSIsImFsbG93ZWQtb3JpZ2lucyI6WyIvKiJdLCJyZWFsbV9hY2Nlc3MiOnsicm9sZXMiOlsib2ZmbGluZV9hY2Nlc3MiLCJpZGVhNHJjX3Jlc2VhcmNoX3RlYW1fcHJpbmNpcGFsX2ludmVzdGlnYXRvciIsInVtYV9hdXRob3JpemF0aW9uIiwiZGVmYXVsdC1yb2xlcy1pZGVhNHJjIl19LCJyZXNvdXJjZV9hY2Nlc3MiOnsiYWNjb3VudCI6eyJyb2xlcyI6WyJtYW5hZ2UtYWNjb3VudCIsIm1hbmFnZS1hY2NvdW50LWxpbmtzIiwidmlldy1wcm9maWxlIl19fSwic2NvcGUiOiJlbWFpbCBwcm9maWxlIiwic2lkIjoiYTQ1ZjkwOTYtNDZiNi00N2UzLWI1YWMtZDAyMmE2ZDA4MDE4IiwiZW1haWxfdmVyaWZpZWQiOnRydWUsIm5hbWUiOiJLb25zdGFudGlub3MgVm90aXMiLCJwcmVmZXJyZWRfdXNlcm5hbWUiOiJkZW1vXzFAZGV2ZWxvcG1lbnQtaXRpLmNvbSIsImdpdmVuX25hbWUiOiJLb25zdGFudGlub3MiLCJmYW1pbHlfbmFtZSI6IlZvdGlzIiwiZW1haWwiOiJkZW1vXzFAZGV2ZWxvcG1lbnQtaXRpLmNvbSJ9.WBIdbGvzPiDxxxkxsiY3G5YJItPwgW_EYnsQTD0DSrMiE7hQy0Kt5U3jxBATDK7M9WjlHIPQgJzu00zP8zrToYHOrkFoPezfyAo9T4aXQfui7QViU98a1FnQf8d2lzaUwlA-s-WvbmSVVY2xUYVVryv_r1KQ-hGjbVHJdn4nsGYMkbK2kvLjFFUGAj-o-mMHF6IdgXiEZZDsaunD0a6gDXEZ2K48gzKjLMinbFqluW_qXF9zjD9EqGLXIw37EaMJ2iXPuQFVEcXll3yvKMFHmzZM1vHiGPMD8HyZwcwjnvi-ZKI-UqsQYnmAkD6Q5MjijKqCMdHI-tXeZ2x-u94Lqg"
    //TODO discomment
    // 
    // console.log('AuthInterceptor - Token:', token);
    

    if (token) {
      const cloned = req.clone({
        headers: req.headers.set('Authorization', `Bearer ${token}`)
      });
      return next.handle(cloned);
    }

    return next.handle(req);
  }
}