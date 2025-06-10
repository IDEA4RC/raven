import { Component } from '@angular/core';
import { CoreService } from 'src/app/services/core.service';
import { FormGroup, FormControl, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from 'src/app/services/auth.service';
@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent {

  options = this.settings.getOptions();

  // Error text for login
  error = ""
  constructor(private settings: CoreService, private router: Router, private authService: AuthService) {}

  form = new FormGroup({
    username: new FormControl('', [Validators.required, Validators.minLength(6)]),
    password: new FormControl('', [Validators.required]),
  });

  get f() {
    return this.form.controls;
  }

  submit() {
    // console.log(this.form.value);
    // this.router.navigate(['/dashboards/dashboard1']);
    const { username, password } = this.form.value;
    console.log('Login action triggered with:', username, password);
    
    this.authService.login({ 
      username: username || '', 
      password: password || '' 
    }).subscribe({
      next: () => this.router.navigate(['/discovery/metadata-search']),
      error: (err: any) => {
      console.error('Login failed', err);
      if (err.status === 401) {
        // Display an error message for unauthorized access
        console.log('Unauthorized access - invalid credentials');
        this.error = 'Invalid username or password';
      }
      }
    });
  }
  withoutLogin() {
    localStorage.setItem('access', 'without_login');
    this.router.navigate(['/discovery/metadata-search']);
  }
}
