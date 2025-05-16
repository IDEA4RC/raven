import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';

@Component({
  selector: 'app-dialogform-login',
  templateUrl: './dialogform-login.component.html',
  styleUrl: './dialogform-login.component.scss'
})
export class DialogformLoginComponent implements OnInit {

  constructor(public dialog: MatDialog,
    private snackBar: MatSnackBar,
    private httpClient: HttpClient,
    public dialogRef: MatDialogRef<DialogformLoginComponent>,
    public router: Router,
  ) { }

  form = new FormGroup({
      uname: new FormControl('', [Validators.required, Validators.minLength(6)]),
      password: new FormControl('', [Validators.required]),
    });
  
  get f() {
    return this.form.controls;
  }

  showLoginForm:boolean = false;
  showWorkspaceForm:boolean = false;

  ngOnInit(): void {
    // Initialization logic can go here
  }

  onSubmit() {
    // Handle form submission
    console.log('Form submitted');
  }

  // Function to redirect to the login form
  loginForm() {
    // Handle login form submission
    console.log('Login form submitted');
    this.showLoginForm = true;
  }

  login() {
    // Handle login action
    console.log('Login action triggered');
    this.showLoginForm = false;
    this.showWorkspaceForm = true;
  }

  onCancel() {
    // Handle cancel action
    console.log('Form cancelled');
    this.dialogRef.close();
  }

  continueLater() {
    // Handle continue later action
    console.log('Continue later action triggered');
    // this.goToPage('workspace');
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
