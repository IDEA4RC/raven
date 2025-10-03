import { Component, inject, Input, OnInit } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { WorkspaceService } from '../workspace.service';
import { Observable } from 'rxjs';
import { Workspace } from '../workspace.model';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { DialogformDeleteComponent } from '../dialogform-delete/dialogform-delete.component';

@Component({
  selector: 'app-individual-wokspace',
  templateUrl: './individual-wokspace.component.html',
  styleUrl: './individual-wokspace.component.scss'
})
export class IndividualWokspaceComponent implements OnInit {


  private _activatedRoute = inject(ActivatedRoute);

  constructor(
      private snackBar: MatSnackBar,
      private workspaceService: WorkspaceService,
      private router: Router,
      private dialogModel: MatDialog) { }

  // Observables
  observable_individual_wokspace$ : Observable<any> | undefined;
  observable_workspace_history$ : Observable<any> | undefined;

  workspaceData: any = { }
  workspaceHistory: any = [];

  // User journey phases' statusesapping structure
  metadataStatusMap = ['Pending', 'In Progress', 'Completed'];
  dataAccessStatusMap = ['Pending', 'Initiated', 'Submitted', 'Rejected', 'Granted', 'Expired'];
  dataAnalysisStatusMap = ['Pending', 'In Progress', 'Completed'];
  resultReportStatusMap = ['Pending', 'In Progress', 'Completed'];



  // Define the steps for the workspace status
  steps = [
    { key: 'metadata_search', label: 'Metadata Search', icon: 'search' },
    { key: 'data_access', label: 'Data Access', icon: 'lock_open' },
    { key: 'data_analysis', label: 'Data Analysis', icon: 'deployed_code' },
    { key: 'result_report', label: 'Result Report', icon: 'check' },
  ];

  // Form for filtering the history table
  private _formBuilder = inject(FormBuilder);

  historyFilterForm = this._formBuilder.group({
    date: [false],
    action: [false],
    phase: [false]
  });


  ngOnInit(): void {

    // Subscribe to the route parameters to get the workspace ID from the URL
    // This will allow us to fetch the workspace data based on the ID in the URL
    // Assuming the route is something like '/workspace/:id'
    // where :id is the dynamic part of the URL representing the workspace ID
    this._activatedRoute.params.subscribe(params => {
      const workspaceId = +params['id']; // Convert to number with +
      if (workspaceId) {
        // Use the workspaceId to fetch workspace data
        this.workspaceService.getWorkspaceById(workspaceId);
        // Get the workspace history
        this.workspaceService.getWorkspaceHistory(workspaceId);
      }
    });
    // Get observables variables
    this.observable_individual_wokspace$ = this.workspaceService.individualWorkspace;
    this.observable_workspace_history$ = this.workspaceService.workspaceHistory;
  
    // Subscribe to the observable individual workspace
    this.observable_individual_wokspace$.subscribe((data) => {
      
        switch (data.status) {
          case 0:
            data.status = 'Metadata Search';
            break;
          case 1:
            data.status = 'Data Access';
            break;
          case 2:
            data.status = 'Data Analysis';
            break;
          case 3:
            data.status = 'Result Report';
            break;
        }
        
            
      this.workspaceData = data;
      
    })

    // Subscribe to the observable workspace history
    this.observable_workspace_history$.subscribe((data) => {
      this.workspaceHistory = data;
    }
    );
  }


  getStatusLabel(stepKey: string): string {
    const status = this.workspaceData[stepKey];
    switch (stepKey) {
      case 'metadata_search':
        return this.metadataStatusMap[status] || 'Unknown';
      case 'data_access':
        return this.dataAccessStatusMap[status] || 'Unknown';
      case 'data_analysis':
        return this.dataAnalysisStatusMap[status] || 'Unknown';
      case 'result_report':
        return this.resultReportStatusMap[status] || 'Unknown';
      default:
        return 'Unknown';
    }
  }

  getStepClass(stepKey: string): string {
  const status = this.workspaceData[stepKey];

  switch (stepKey) {
    case 'metadata_search':
    case 'data_analysis':
    case 'result_report':
      if (status === 2) return 'step completed';
      if (status === 1) return 'step progress'; // use 'progress' for "in progress"
      return 'step pending';

    case 'data_access':
      switch (status) {
        case 0: return 'step pending';
        case 1: return 'step iniciated';
        case 2: return 'step progress'; // "submitted" could be considered 'in progress'
        case 3: return 'step rejected';
        case 4: return 'step completed';
        case 5: return 'step expired';
        default: return 'step pending';
      }

    default:
      return 'step pending';
  }
}

  getConnectorClass(index: number): string {
    const stepA = this.steps[index].key;
    const stepB = this.steps[index + 1].key;

    const stepAClass = this.getStepClass(stepA);
    const stepBClass = this.getStepClass(stepB);

    if (stepAClass === 'step completed' && stepBClass !== 'step pending') {
      return 'step-connector active';
    } else if (stepAClass === 'step completed') {
      return 'step-connector completed';
    }
    return 'step-connector pending';
  }

  // Remove the workspace from the database
  deleteWorkspace() {
    
    if(this.workspaceData.id) {
        const dialogRef = this.dialogModel.open(DialogformDeleteComponent, {
          disableClose: true,
          data: {
            workspace_id: this.workspaceData.id,
          }
      });
      dialogRef.afterClosed().subscribe((success: boolean) => {
        if(success) {
          // Show success notification
          this.showNotification(
            "black",
            "Workspace deleted successfully",
            "bottom",
            "center")
        } else {
          // Show error notification
          this.showNotification(
            "black",
            "Cancelled workspace deletion",
            "bottom",
            "center")
        }
        
        // Refresh the workspace data after deletion
        this.workspaceService.getWorkspace();
      });
    }
    
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
      panelClass: ['centered-snackbar', colorName]  // multiple classes if needed
    });
  }

  


}
