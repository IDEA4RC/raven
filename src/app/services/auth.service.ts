import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  // private apiUrl = 'https://your-api.com/auth'; // Replace with your API
  private apiUrl = '/realms/idea4rc/protocol/openid-connect/token'; // Replace with your API endpoint
  private tokenKey = 'access_token';

  private isAuthenticatedSubject = new BehaviorSubject<boolean>(this.hasToken());
  public isAuthenticated$ = this.isAuthenticatedSubject.asObservable();

  constructor(private http: HttpClient) {}
  
  login(credentials: { username: string, password: string }): Observable<any> {
    const body = new URLSearchParams();
    body.set('client_id', 'raven');
    body.set('grant_type', 'password');
    body.set('username', credentials.username);
    body.set('password', credentials.password);

    const httpOptions = {
      headers: new HttpHeaders({
        'Content-Type': 'application/x-www-form-urlencoded'
      })
    };
  
    return this.http.post<any>(this.apiUrl, body.toString(), httpOptions)
    .pipe(
      tap(response => {
        // Keycloak returns access_token rather than token
        localStorage.setItem(this.tokenKey, response.access_token);
        localStorage.setItem('userId', '1'); // Example userId, replace with actual user ID if available
        localStorage.setItem('access', 'login');
        this.isAuthenticatedSubject.next(true);
      })
    );
  }

  logout(): void {
    console.log('Logging out...');
    console.log('this.tokenKey:', this.tokenKey);
    
    
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem('userId');
    localStorage.removeItem('access');
    this.isAuthenticatedSubject.next(false);
  }

  // Check if the user is authenticated
  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  private hasToken(): boolean {
    return !!localStorage.getItem(this.tokenKey);
  }
}
