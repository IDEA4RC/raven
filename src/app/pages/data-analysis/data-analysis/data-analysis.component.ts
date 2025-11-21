import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { DataAnalysisService } from './data-analysis.service';
import { Observable } from 'rxjs';
import { MatSort } from '@angular/material/sort';
import { MatPaginator } from '@angular/material/paginator';
import { Analysis } from './analysis.model';
import { MatTableDataSource } from '@angular/material/table';
import { Router } from '@angular/router';
import { DialogformDeleteAnalysisComponent } from './dialogform-delete-analysis/dialogform-delete-analysis.component';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
@Component({
  selector: 'app-data-analysis',
  templateUrl: './data-analysis.component.html',
  styleUrl: './data-analysis.component.scss'
})
export class DataAnalysisComponent implements OnInit, OnDestroy {

  // Observables analysis
  observable_analysis$ : Observable<any> | undefined;
  private analysisSubscription: any;

  // Table components
  dataSource = new MatTableDataSource<Analysis>();
  displayedColumns: string[] = ['id','analysis_name', 'creation_date', 'update_date', 'action'];

  // Variable to store the current workspace ID from the route
  workspaceId: string | undefined;
  // ViewChild to access the paginator and sort components
  @ViewChild(MatSort) sort!: MatSort;
  @ViewChild(MatPaginator) paginator!: MatPaginator;

  
  ngOnInit(): void {

    // Extract workspace ID from the current URL
    const urlSegments = this.router.url.split('/');
    const workspaceIndex = urlSegments.indexOf('workspace');    
    
    if (workspaceIndex !== -1 && urlSegments.length > workspaceIndex + 1) {
      this.workspaceId = urlSegments[workspaceIndex + 1];
      this.dataAnalysisService.getAnalysis(this.workspaceId as unknown as number);

    }

    // Get the observable from the service
    this.observable_analysis$ = this.dataAnalysisService.analysis
    // Subscribe to the observable patients
    this.analysisSubscription = this.observable_analysis$.subscribe((data) => {
      this.dataSource.data = data;
    });
  }

  ngAfterViewInit() {
    // Set the paginator and sort for the data source
    this.dataSource.sort = this.sort;
    this.dataSource.paginator = this.paginator;
  }

  ngOnDestroy(): void {
    // Unsubscribe from the observable to prevent memory leaks
    if (this.analysisSubscription) {
      this.analysisSubscription.unsubscribe();
    }
  }

  constructor(
    private dataAnalysisService: DataAnalysisService,
    private router: Router,
    private dialogModel: MatDialog,
    private snackBar: MatSnackBar,
    
  ) { }

  // Search engine function to filter the table based on user input
  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filterPredicate = (data: Analysis, filter: string) =>
      data.analysis_name.toLowerCase().includes(filter.trim().toLowerCase());
    this.dataSource.filter = filterValue.trim().toLowerCase();
    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
  }

  // Function to create a new analysis
  newAnalysis() {
    this.router.navigate([`/workspace/${this.workspaceId}/data-analysis/new`]);
  }

  // Function to open an indivisual analysis
  openAnalysis(analysisId: number) {
    this.router.navigate([`/workspace/${this.workspaceId}/data-analysis`, analysisId]);
    // Logic to open the analysis details
    console.log(`Opening analysis with ID: ${analysisId}`);
  }

  // Function to delete an analysis
  deleteAnalysis(analysisId: number) {
    // Logic to delete the analysis
    const dialogRef = this.dialogModel.open(DialogformDeleteAnalysisComponent, {
      disableClose: true,
      data: {
        analysis_id: analysisId,
      }
    });
    dialogRef.afterClosed().subscribe((success: boolean) => {

      if(success) {
        this.dataAnalysisService.getAnalysis(this.workspaceId as unknown as number); // Refresh the analysis list
        // Show success notification
        this.showNotification(
            "black",
            "Analysis deleted successfully",
            "bottom",
            "center")
      } else {
        // Show error notification
         this.showNotification(
            "black",
            "Error deleting analysis",
            "bottom",
            "center")
      }
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
      panelClass: colorName
    });
  }

  

}

