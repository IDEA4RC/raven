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


  @ViewChild(MatSort) sort!: MatSort;
  @ViewChild(MatPaginator) paginator!: MatPaginator;

  
  ngOnInit(): void {
    // Get the observable from the service
    this.observable_analysis$ = this.dataAnalysisService.analysis
    // Subscribe to the observable patients
    this.analysisSubscription = this.observable_analysis$.subscribe((data) => {
      console.log('Analysis data:', data);
      this.dataSource.data = data;
    });
    this.dataAnalysisService.getAnalysis();
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
    private dialogModel: MatDialog
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
    this.router.navigate(['/data-analysis/new-analysis']);
  }

  // Function to open an indivisual analysis
  openAnalysis(analysisId: number) {
    this.router.navigate(['/data-analysis', analysisId]);
    // this.router.navigate(['/workspace', analysisId]);
    // Logic to open the analysis details
    console.log(`Opening analysis with ID: ${analysisId}`);
  }

  // Function to delete an analysis
  deleteAnalysis(analysisId: number) {
    // Logic to delete the analysis
    console.log(`Deleting analysis with ID: ${analysisId}`);
    const dialogRef = this.dialogModel.open(DialogformDeleteAnalysisComponent, {
      disableClose: true,
      data: {
        analysis_id: analysisId,
      }
    });
  }

  // Remove the workspace from the database
    // deleteWorkspace(workspace: Workspace) {
    
    //   const dialogRef = this.dialogModel.open(DialogformDeleteAnalysisComponent, {
    //     disableClose: true,
    //     data: {
    //       workspace_id: workspace.id,
    //     }
    //   });
    //   dialogRef.afterClosed().subscribe((success: boolean) => {
  
    //     if(success) {
    //       // Show success notification
    //       this.showNotification(
    //         "black",
    //         "Workspace deleted successfully",
    //         "bottom",
    //         "center")
    //     } else {
    //       // Show error notification
    //       this.showNotification(
    //         "black",
    //         "Cancelled workspace delition",
    //         "bottom",
    //         "center")
    //     }
  
        
    //     // Refresh the workspace data after deletion
    //     this.workspaceService.getWorkspace();
    //   });
       
    // }

}

