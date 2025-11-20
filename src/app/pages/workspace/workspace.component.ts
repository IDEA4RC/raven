import { Component, inject, OnInit, ViewChild } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { WorkspaceHistoryTableComponent } from './workspace-history-table/workspace-history-table.component';
import { Router } from '@angular/router';
import { Observable, Subject, takeUntil } from 'rxjs';
import { WorkspaceService } from './workspace.service';
import { MatTableDataSource } from '@angular/material/table';
import { MatSort } from '@angular/material/sort';
import { MatPaginator } from '@angular/material/paginator';
import { Workspace } from './workspace.model';
import { DialogformDeleteComponent } from './dialogform-delete/dialogform-delete.component';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarHorizontalPosition, MatSnackBarVerticalPosition } from '@angular/material/snack-bar';
@Component({
  selector: 'app-workspace',
  templateUrl: './workspace.component.html',
  styleUrl: './workspace.component.scss'
})
export class WorkspaceComponent implements OnInit {

  // Destroy subject for takeUntil
  private destroy$ = new Subject<void>();

  private _formBuilder = inject(FormBuilder);

  historyFilterForm = this._formBuilder.group({
    date: [false],
    action: [false],
    phase: [false]
  });

  // Observables
  observable_wokspace$ : Observable<any> | undefined;

  // Table components
  dataSource = new MatTableDataSource<Workspace>();
  displayedColumns: string[] = ['name', 'update_date', 'status', 'action'];


  @ViewChild(MatSort) sort!: MatSort;
  @ViewChild(MatPaginator) paginator!: MatPaginator;

  constructor(
    private snackBar: MatSnackBar,
    private workspaceService: WorkspaceService,
    private router: Router,
    private dialogModel: MatDialog,
  ) { }

  ngOnInit(): void {

    // Get observables variables
    this.observable_wokspace$ = this.workspaceService.workspace;

    // Subscribe to the observable patients
    this.observable_wokspace$.pipe(takeUntil(this.destroy$))
    .subscribe((data) => {
      let data_mapped = data.map((workspace: Workspace) => {
        
        switch (workspace.status) {
          case 0:
            workspace.status = 'Metadata Search';
            break;
          case 1:
            workspace.status = 'Data Access';
            break;
          case 2:
            workspace.status = 'Data Analysis';
            break;
          case 3:
            workspace.status = 'Result Report';
            break;
        }
        return workspace;
      });
      // Sort data by id before assigning to dataSource
      data_mapped.sort((a: Workspace, b: Workspace) => {
        return a.id - b.id;
      });
      this.dataSource.data = data_mapped as Workspace[];
      
    });

    // Get the workspace data
    this.workspaceService.getWorkspace()
    


    
  }

  ngAfterViewInit(): void {
    // Initialize the data source
    this.dataSource.sort = this.sort;
    this.dataSource.paginator = this.paginator;
  }

  ngOnDestroy(): void {
    // Complete the destroy subject
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Search engine function to filter the table based on user input
  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filterPredicate = (data: Workspace, filter: string) => {
      return data.name.toLowerCase().includes(filter.toLowerCase());
    };
    this.dataSource.filter = filterValue.trim().toLowerCase();

    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
  }

  // Navigate to the metadata searach to create a new workspace
  newWorkspace() {
    this.router.navigate(['/discovery/metadata-search'])
  }

  // Navigate to the user journey phase of the workspace
  goToStatus(workspace: Workspace) {

    switch(workspace.status) {
      case "Data Permit": {
        // Redirect to the data permit platform
        window.location.href = `//idea4rc-data-permit-platform.iti.gr//auth/callback?access_token=${localStorage.getItem('access_token')}`;
        break;
      }
      case "Data Analysis": {
        this.router.navigate([`/workspace/${workspace.id}/data-analysis`])
        break;
      }
    }
   }

  // Navigate to the individual workspace
  openWorkspace(workspace: Workspace) {
    // this.router.navigate(['/workspace/individual-workspace', workspace.id]);
    this.router.navigate(['/workspace', workspace.id]);
  }

  // Remove the workspace from the database
  deleteWorkspace(workspace: Workspace) {
  
    const dialogRef = this.dialogModel.open(DialogformDeleteComponent, {
      disableClose: true,
      data: {
        workspace_id: workspace.id,
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
          "Cancelled workspace delition",
          "bottom",
          "center")
      }

      
      // Refresh the workspace data after deletion
      this.workspaceService.getWorkspace();
    });
     
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
