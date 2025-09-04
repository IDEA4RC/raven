import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { CohortSelectionService } from './cohort-selection.service';
import { Observable } from 'rxjs';
import { MatSort } from '@angular/material/sort';
import { MatPaginator } from '@angular/material/paginator';
import { Cohort } from './cohort.model';
import { MatTableDataSource } from '@angular/material/table';

@Component({
  selector: 'app-cohort-selection',
  templateUrl: './cohort-selection.component.html',
  styleUrl: './cohort-selection.component.scss'
})
export class CohortSelectionComponent implements OnInit, OnDestroy {

  // Observables cohort
  observable_cohort$ : Observable<any> | undefined;
  private cohortSubscription: any;

  // Table components
  dataSource = new MatTableDataSource<Cohort>();
  displayedColumns: string[] = ['id','cohort_name', 'creation_date', 'update_date', 'status', 'action'];


  @ViewChild(MatSort) sort!: MatSort;
  @ViewChild(MatPaginator) paginator!: MatPaginator;

  
  ngOnInit(): void {
    // Get the observable from the service
    this.observable_cohort$ = this.cohortSelectionService.cohort
    // Subscribe to the observable patients
    this.cohortSubscription = this.observable_cohort$.subscribe((data) => {
      console.log('Cohort data:', data);
      this.dataSource.data = data;
    });
    this.cohortSelectionService.getCohorts();
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

  constructor(private cohortSelectionService: CohortSelectionService) { }

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

}
