import { HttpClient } from '@angular/common/http';
import { Component, Inject, OnInit } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { AuthService } from 'src/app/services/auth.service';
import { MetadataSearchService } from '../metadata-search.service';

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
    private authService: AuthService,
    private metadataSearchService: MetadataSearchService,
  ) { }

  form = new FormGroup({
    username: new FormControl('', [Validators.required, Validators.minLength(6)]),
    password: new FormControl('', [Validators.required]),
  });
  
  get f() {
    return this.form.controls;
  }

  showLoginError:boolean = false;
  showLoginForm:boolean = false;
  loginError:boolean = false;


  // Variable to toggle password visibility
  hidePassword = true;


  ngOnInit(): void {
    
    let userLoogedIn = localStorage.getItem('access_token') ? true : false;
    // If the user is logged in, save the workspace in the database
    if(!userLoogedIn) {
      this.showLoginError = true;
    }
  }

  onSubmit() {
    const { username, password } = this.form.value;
    console.log('Login action triggered with:', username, password);
    
    this.authService.login({ 
      username: username || '', 
      password: password || '' 
    }).subscribe({
      next: () => {
      this.showLoginForm = false
      
      this.showLoginError = false
      this.dialogRef.close('success');
    },
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

  // saveWorkspace() {

  //   let wokspaceData = 
  //     {
  //       "name": this.data.workspaceName,
  //       "description": this.data.workspaceDescription,
  //       "metadata_search": 2,
  //       "data_access": 1,
  //       "data_analysis": 0,
  //       "results_report": 0,
  //       "status": "Data Permit",
  //       "team_ids": []
  //     }
    
  //   this.metadataSearchService.createWorkspace(wokspaceData).subscribe({
  //     next: (response: any) => {
  //       console.log('Workspace created successfully:', response);

  //       // Map selected variables to their IDs //TODO
  //       let variablesId = ["SOMETHING", "SOMETHING", "SOMETHING"]
  //       // this.data.selectedVariables.map((variable: any) => variable.id);
  //       // Create the data application object
  //       let dataApplication = {
          
  //           "user_id": "e140f671-2247-4c53-b7bf-6cefa6ac6d37",
  //           "workspace_id": response.id,
  //           "workspace_name": response.name,
  //           "metadata": {
  //               "type_cancer": this.data.cancerType,
  //               "variables_id": variablesId,
  //               "coes_id": this.data.selectedCenters
            
  //           }
  //       }
  //       //  "user_id": "e140f671-2247-4c53-b7bf-66d37",
  //       //   "workspace_id":12,
  //       //   "workspace_name": "Sarcoma Disease Trends",
  //       //   "metadata": {
  //       //       "type_cancer": "H&N",
  //       //       "variables_id": ["SOMETHING", "SOMETHING", "SOMETHING"],
  //       //       "coes_id": ["INT", "CLB"]
  //       //   }
  //       this.metadataSearchService.createDataApplication(dataApplication).subscribe({
  //         next: (response: any) => {
  //           console.log('Data application created successfully:', response);
  //           this.showWorkspaceForm = true;
  //         },
  //         error: (error: any) => {
  //           console.error('Error creating data application:', error);
  //           this.snackBar.open('Error creating data application', 'Close', {
  //             duration: 3000,
  //             panelClass: ['error-snackbar']
  //           });
  //         }
  //       });
  //     },
  //     error: (error: any) => {
  //       console.error('Error creating workspace:', error);
  //       this.snackBar.open('Error creating workspace', 'Close', {
  //         duration: 3000,
  //         panelClass: ['error-snackbar']
  //       });
  //     }
  //   })


  // }

  // Function to show the login form
  loginForm() {
    // Handle login form submission
    this.showLoginError = false;
    this.showLoginForm = true;
  }


  onCancel() {
    // Handle cancel action
    console.log('Form cancelled');
    this.dialogRef.close();
  }
  
  // Function to toggle password visibility
  togglePasswordVisibility() {
    this.hidePassword = !this.hidePassword;
  }

  goToPage(pageName:string):void{
    this.router.navigate([pageName]);
  }
  

}
