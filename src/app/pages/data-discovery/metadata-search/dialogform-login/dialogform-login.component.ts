import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { AuthService } from 'src/app/services/auth.service';

@Component({
  selector: 'app-dialogform-login',
  templateUrl: './dialogform-login.component.html',
  styleUrl: './dialogform-login.component.scss'
})
export class DialogformLoginComponent implements OnInit {

  // Error text for login
  error = ""

  constructor(public dialog: MatDialog,
    private snackBar: MatSnackBar,
    private httpClient: HttpClient,
    public dialogRef: MatDialogRef<DialogformLoginComponent>,
    public router: Router,
    private authService: AuthService
  ) { }

  form = new FormGroup({
      username: new FormControl('', [Validators.required, Validators.minLength(6)]),
      password: new FormControl('', [Validators.required]),
    });
  
  get f() {
    return this.form.controls;
  }

  showLoginForm:boolean = false;
  showWorkspaceForm:boolean = false;
  loginError:boolean = false;
  ngOnInit(): void {
    // Initialization logic can go here
  }

  onSubmit() {
    // Handle form submission
    console.log('Form submitted');
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
      next: () => (this.showLoginForm = false, this.showWorkspaceForm = true),
      // this.router.navigate(['/discovery/metadata-search']),
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

  // Function to redirect to the login form
  loginForm() {
    // Handle login form submission
    console.log('Login form submitted');
    this.showLoginForm = true;
  }

  login() {
    const userInput = this.form.get('username')?.value;
    const passwordInput = this.form.get('password')?.value;
    
    if (userInput === 'research_team_pi@iti.gr' && passwordInput === '123456') {
      console.log('Login action triggered');
      this.showLoginForm = false;
      this.showWorkspaceForm = true;
    } else {
      this.loginError = true
    }
      
  }

  onCancel() {
    // Handle cancel action
    console.log('Form cancelled');
    this.dialogRef.close();
  }

  continueLater() {
    // Handle continue later action
    console.log('Continue later action triggered');
    this.goToPage('workspace');
    this.dialogRef.close();

  }
  
  dataAccess() {
    // Redirect to the data permit platform
    window.location.href = 'https://idea4rc-data-permit-platform.iti.gr/';
  }

  goToPage(pageName:string):void{
    this.router.navigate([pageName]);
  }
  

}
