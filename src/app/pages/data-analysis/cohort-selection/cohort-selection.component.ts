import { Component, EventEmitter, OnDestroy, OnInit, Output, ViewChild } from '@angular/core';
import { DataAnalysisService } from '../data-analysis/data-analysis.service';
import { Observable } from 'rxjs';
import { MatSort } from '@angular/material/sort';
import { MatPaginator } from '@angular/material/paginator';
import { Cohort } from './cohort.model';
import { MatTableDataSource } from '@angular/material/table';
import { Router } from '@angular/router';

@Component({
  selector: 'app-cohort-selection',
  templateUrl: './cohort-selection.component.html',
  styleUrl: './cohort-selection.component.scss'
})
export class CohortSelectionComponent implements OnInit, OnDestroy {

  // Variable to store the current workspace ID from the route
  workspaceId: string | undefined;
  analysisId: string | undefined;

  // Observables cohort
  observable_cohort$ : Observable<any> | undefined;
  private cohortSubscription: any;

  // Table components
  dataSource = new MatTableDataSource<Cohort>();
  displayedColumns: string[] = ['id','cohort_name', 'creation_date', 'update_date', 'status', 'action'];


  @ViewChild(MatSort) sort!: MatSort;
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @Output() nextStep = new EventEmitter<void>();

  constructor(
    private dataAnalysisService: DataAnalysisService,
    private router: Router
  ) { }
  
  ngOnInit(): void {

    // Extract workspace ID from the current URL
    const urlSegments = this.router.url.split('/');
    const workspaceIndex = urlSegments.indexOf('workspace');    
    
    if (workspaceIndex !== -1 && urlSegments.length > workspaceIndex + 1) {
      this.workspaceId = urlSegments[workspaceIndex + 1];
    }

    // Get the observable from the service
    this.observable_cohort$ = this.dataAnalysisService.cohort
    // Subscribe to the observable patients
    this.cohortSubscription = this.observable_cohort$.subscribe((data) => {
      this.dataSource.data = data;
    });
    this.dataAnalysisService.getCohorts();
  }

  ngAfterViewInit() {
    // Set the paginator and sort for the data source
    this.dataSource.sort = this.sort;
    this.dataSource.paginator = this.paginator;
  }

  ngOnDestroy(): void {
    // Unsubscribe from the observable to prevent memory leaks
    if (this.cohortSubscription) {
      this.cohortSubscription.unsubscribe();
    }
  }


  // Search engine function to filter the table based on user input
  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filterPredicate = (data: Cohort, filter: string) =>
      data.cohort_name.toLowerCase().includes(filter.trim().toLowerCase());
    this.dataSource.filter = filterValue.trim().toLowerCase();
    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
  }

  // Functions for buttons
  goToCohortManager() {
    // Logic to navigate to the cohort manager
    console.log('Navigating to Cohort Manager');
  }
  goToNLPCohort() {
    // Logic to navigate to the cohort selection
    console.log('Navigating to Cohort Selection');
  }
  executeQuery(cohortId: number) {
    // Logic to execute the query for the selected cohort
    console.log(`Executing query for cohort ID: ${cohortId}`);
  }
  // Button to navigate to the previous page (Data Analysis main page)
  backAnalysis() {
     this.router.navigate([`/workspace/${this.workspaceId}/data-analysis`]);
  }
  goNext() {
    this.nextStep.emit();
  }

}
