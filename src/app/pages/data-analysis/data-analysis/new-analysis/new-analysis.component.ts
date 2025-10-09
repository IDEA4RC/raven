import {AfterViewInit, ChangeDetectorRef, Component, ElementRef, OnInit, QueryList, ViewChild, ViewChildren, inject} from '@angular/core';
import {FormBuilder, Validators, FormControl, FormsModule, ReactiveFormsModule} from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { DataAnalysisService } from '../data-analysis.service';

@Component({
  selector: 'app-new-analysis',
  templateUrl: './new-analysis.component.html',
  styleUrl: './new-analysis.component.scss'
})
export class NewAnalysisComponent implements OnInit {

  // Variable to store the current workspace ID from the route
  workspaceId: string | undefined;

  // Form groups
  private _formBuilder = inject(FormBuilder);
  readonly analysisNameCtrl = new FormControl('', Validators.required);
  readonly analysisDescriptionCtrl = new FormControl('', Validators.required);
  
  analysisFormGroup = this._formBuilder.group({
    analysisNameCtrl: this.analysisNameCtrl,
    analysisDescriptionCtrl: this.analysisDescriptionCtrl

  });

  constructor(
      private snackBar: MatSnackBar,
      private dialogModel: MatDialog,
      private router: Router,
      private dataAnalysisService: DataAnalysisService
  
  
    ) {}
  ngOnInit(): void {
    // Extract workspace ID from the current URL
    const urlSegments = this.router.url.split('/');
    const workspaceIndex = urlSegments.indexOf('workspace');    
    
    if (workspaceIndex !== -1 && urlSegments.length > workspaceIndex + 1) {
      this.workspaceId = urlSegments[workspaceIndex + 1];
    }
  }

  // Function to go back to the data analysis table page
  backAnalysis() {
    this.router.navigate([`/workspace/${this.workspaceId}/data-analysis`]);
  }
  // Function to create a new analysis and navigate to the data analysis table page
  createAnalysis() {
    // Logic to create a new analysis
    console.log('Creating a new analysis');
    // Get values from the form
    const analysisName = this.analysisNameCtrl.value;
    const analysisDescription = this.analysisDescriptionCtrl.value;
    // Validate form data
    if (!analysisName || !analysisDescription) {
      this.showNotification(
        "black",
        "Please fill in all analysis fields",
        "bottom",
        "center"
      );
      return;
    }
    // Create workspace data object
    const analysisData = {
      name: analysisName,
      description: analysisDescription,
      user_id: 1, // Placeholder user ID
      workspace_id: this.workspaceId, // Placeholder workspace ID
    };
     // TODO: Send the data to a service for persistence
//     // this.dataAnalysisService.createAnalysis(analysisData).subscribe(...
    
    this.showNotification(
      "green",
      "Analysis created successfully",
      "bottom",
      "center"
    );
    this.router.navigate([`/workspace/${this.workspaceId}/data-analysis`]);
  }


  /**
   * Function to show a notification in the frontend
   * @param colorName the color of the notification
   * @param text the text message
   * @param placementFrom the position from where the notification will appear
   * @param placementAlign the position where the notification will align
   */
  showNotification(colorName: string, text: string, placementFrom: any, placementAlign: any) {
    this.snackBar.open(text, "", {
      duration: 2000,
      verticalPosition: placementFrom,
      horizontalPosition: placementAlign,
      panelClass: colorName
    });
  }
}