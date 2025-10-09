import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  // private apiUrl = 'https://your-api.com/auth'; // Replace with your API
  private apiUrl = '/realms/idea4rc/protocol/openid-connect/token'; // Replace with your API endpoint
  private tokenKey = 'access_token';
  private userIdKey = 'userId';

  // Observable to track authentication status (true/false)
  private isAuthenticatedSubject = new BehaviorSubject<boolean>(this.hasToken());
  public isAuthenticated$ = this.isAuthenticatedSubject.asObservable();

  constructor(private http: HttpClient, private router: Router) {}
  
  /**
   * Function to log in the user with keycloak and save the token and user info in local storage
   * @param credentials username and password
   * @returns 
   */
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
        const token = response.access_token;
        if (token) {
          localStorage.setItem(this.tokenKey, token);
          localStorage.setItem(this.userIdKey, '1');
          // localStorage.setItem('userId', '1'); // Example userId, replace with actual user ID if available
          this.isAuthenticatedSubject.next(true);
        }
      })
    );
  }

  /**
   * Function to log out the user by removing the token and user info from local storage
   */
  logout(): void {
    console.log('Logging out...');
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.userIdKey);
    this.isAuthenticatedSubject.next(false);
    this.router.navigate(['/authentication/login']); // redirect to login page after logout
  }

  /**
   * 
   * @returns the token from local storage or null if not found
   */
  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  /**
   * @return the userId from local storage or null if not found
   */
  getUserId(): string | null {
    return localStorage.getItem(this.userIdKey);
  }

  /**
   * @returns true if the user is logged in (token exists), false otherwise
   */
  private hasToken(): boolean {
    return !!localStorage.getItem(this.tokenKey);
  }

  /**
   * Handle authentication errors by logging out the user
   */
  handleAuthError(): void {
    this.logout();
  }
}
