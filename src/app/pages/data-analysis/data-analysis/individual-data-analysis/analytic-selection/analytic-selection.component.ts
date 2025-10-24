
import { Component, EventEmitter, OnDestroy, OnInit, Output, ViewChild } from '@angular/core';
import { DataAnalysisService } from '../../data-analysis.service';
import { Observable } from 'rxjs';
import { MatSort } from '@angular/material/sort';
import { MatPaginator } from '@angular/material/paginator';
import { Algorithm } from './algorithm.model';
import { MatTableDataSource } from '@angular/material/table';
import { Router } from '@angular/router';
import { SelectionService } from '../selection.service';
import { SelectionModel } from '@angular/cdk/collections';

@Component({
  selector: 'app-analytic-selection',
  templateUrl: './analytic-selection.component.html',
  styleUrl: './analytic-selection.component.scss'
})
export class AnalyticSelectionComponent implements OnInit, OnDestroy {

  // Variable to store the current workspace ID from the route
  workspaceId: string | undefined;
  analysisId: string | undefined;

  // Observables cohort
  observable_cohort$ : Observable<any> | undefined;
  private cohortSubscription: any;

  // Table components
  dataSource = new MatTableDataSource<Algorithm>();
  displayedColumns: string[] = ['select', 'id','cohort_name', 'creation_date', 'update_date', 'status', 'action'];

  selection = new SelectionModel<any>(true, []);

  @ViewChild(MatSort) sort!: MatSort;
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @Output() nextStep = new EventEmitter<void>();

  constructor(
    private dataAnalysisService: DataAnalysisService,
    private router: Router,
    public selectionService: SelectionService
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
    // this.dataAnalysisService.getAlgorithms();
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
    this.dataSource.filterPredicate = (data: Algorithm, filter: string) =>
      data.algorithm_name.toLowerCase().includes(filter.trim().toLowerCase());
    this.dataSource.filter = filterValue.trim().toLowerCase();
    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
  }

  // Functions for buttons
  selectAlgorithm() {
    // Logic to navigate to the cohort manager
    console.log('Navigating to Algorithm Manager');
  }
  
  // Button to navigate to the previous page (Data Analysis main page)
  backAnalysis() {
     this.router.navigate([`/workspace/${this.workspaceId}/data-analysis`]);
  }
  goNext() {
    // Update the selection in the service
    this.selectionService.setSelected(this.selection.selected);
    this.nextStep.emit();
  }


  // ################## SELECTION MODEL FUNCTIONS ##################

  /** Whether the number of selected elements matches the total number of rows. */
  isAllSelected(): any {
    const numSelected = this.selection.selected.length;
    const numRows = this.dataSource.data.filter(row => row.status !== 0).length;
    return numSelected === numRows;
  }

  /** Selects all rows if they are not all selected; otherwise clear selection. */
  masterToggle(): void {
    this.isAllSelected()
      ? this.selection.clear()
      : this.dataSource.data.filter(row => row.status !== 0).forEach((row) => this.selection.select(row));
  }

  /** The label for the checkbox on the passed row */
  checkboxLabel(row?: Algorithm): string {
    if (!row) {
      return `${this.isAllSelected() ? 'select' : 'deselect'} all`;
    }
    return `${this.selection.isSelected(row) ? 'deselect' : 'select'} row ${
      row.id + 1
    }`;
  }


}
