import { Component, OnInit } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { Router } from '@angular/router';

@Component({
  selector: 'app-dialogform-workspace-created',
  templateUrl: './dialogform-workspace-created.component.html',
  styleUrl: './dialogform-workspace-created.component.scss'
})
export class DialogformWorkspaceCreatedComponent implements OnInit {


  constructor(
    public dialogRef: MatDialogRef<DialogformWorkspaceCreatedComponent>,
    public router: Router) { }
  ngOnInit(): void {
      
  }


  continueLater() {
    // Handle continue later action
    console.log('Continue later action triggered');
    this.goToPage('workspace');
    this.dialogRef.close();

  }
  
  dataAccess() {
    // Redirect to the data permit platform
    window.location.href = `https://idea4rc-data-permit-platform.iti.gr//auth/callback?access_token=${localStorage.getItem('access_token')}`;
  }
  goToPage(pageName:string):void{
    this.router.navigate([pageName]);
  }

}
