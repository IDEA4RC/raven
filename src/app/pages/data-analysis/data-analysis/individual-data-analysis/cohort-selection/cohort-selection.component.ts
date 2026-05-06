import { Component, EventEmitter, OnDestroy, OnInit, Output, ViewChild } from '@angular/core';
import { DataAnalysisService } from '../../data-analysis.service';
import { forkJoin, Observable } from 'rxjs';
import { MatSort } from '@angular/material/sort';
import { MatPaginator } from '@angular/material/paginator';
import { Cohort } from './cohort.model';
import { MatTableDataSource } from '@angular/material/table';
import { Router } from '@angular/router';
import { SelectionService } from '../selection.service';
import { SelectionModel } from '@angular/cdk/collections';
import { MatSnackBar } from '@angular/material/snack-bar';
import { map } from 'rxjs/operators';

export interface CohortExtended extends Cohort {
  responded?: string[];
  missing?: string[];
  statusDetail?: 'completed' | 'partial';
}


@Component({
  selector: 'app-cohort-selection',
  templateUrl: './cohort-selection.component.html',
  styleUrl: './cohort-selection.component.scss'
})
export class CohortSelectionComponent implements OnInit, OnDestroy {

  // Variable to store the current workspace ID from the route
  workspaceId: string | undefined;
  analysisId: string | undefined;
  permitId: string | undefined;

  // Observables cohort
  observable_cohort$: Observable<any> | undefined;
  observable_permit$: Observable<any> | undefined;
  private cohortSubscription: any;
  private permitSubscription: any;

  // Table components
  dataSource = new MatTableDataSource<Cohort>();
  displayedColumns: string[] = ['select', 'id', 'cohort_name', 'creation_date', 'update_date', 'status', 'pending_coes', 'action'];

  selection = new SelectionModel<any>(true, []);

  loading = false;


  @ViewChild(MatSort) sort!: MatSort;
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @Output() nextStep = new EventEmitter<void>();

  constructor(
    private snackBar: MatSnackBar,
    private dataAnalysisService: DataAnalysisService,
    private router: Router,
    public selectionService: SelectionService
  ) { }

  ngOnInit(): void {

    // Extract segments
    const urlSegments = this.router.url.split('/');

    // Workspace ID
    const workspaceIndex = urlSegments.indexOf('workspace');
    if (workspaceIndex !== -1 && urlSegments.length > workspaceIndex + 1) {
      this.workspaceId = urlSegments[workspaceIndex + 1];
      this.dataAnalysisService.getPermitByWorkspaceId(this.workspaceId);
    }

    // Analysis ID
    const analysisIndex = urlSegments.indexOf('data-analysis');
    if (analysisIndex !== -1 && urlSegments.length > analysisIndex + 1) {
      this.analysisId = urlSegments[analysisIndex + 1];
      this.dataAnalysisService.getCohorts(this.analysisId as unknown as number);
    }

    // Get the observable from the service
    this.observable_cohort$ = this.dataAnalysisService.cohort
    // Subscribe to the observable patients
    this.cohortSubscription = this.observable_cohort$.subscribe((data) => {
      const cohorts: CohortExtended[] = data;
      const requests = cohorts
        .filter(c => c.status === 3)
        .map(c =>
          this.dataAnalysisService.getCentersCohortsResults(c.id).pipe(
            map(res => ({
              cohortId: c.id,
              ...res
            }))
          )
        );


      if (requests.length === 0) {
        this.dataSource.data = cohorts;
        return;
      }

      forkJoin(requests).subscribe(results => {
        results.forEach(result => {
          const cohort = cohorts.find(c => c.id === result.cohortId);
          if (!cohort) return;

          cohort.responded = result.responded;
          cohort.missing = result.missing;
          cohort.statusDetail = result.missing?.length ? 'partial' : 'completed';
        });

        this.dataSource.data = data;
      });
    });

    // Get the observable permit from the service
    this.observable_permit$ = this.dataAnalysisService.permit
    // Subscribe to the observable permit
    this.permitSubscription = this.observable_permit$.subscribe((data) => {

      this.permitId = data.length > 0 ? data[0].id : undefined;
    });


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
    let token = localStorage.getItem('access_token');
    let userId = localStorage.getItem('user_id');

    const url = `https://gui.fcb.orchestrator.idea.lst.tfo.upm.es/web/advanced-query/${userId}/${this.analysisId}/${this.permitId}/${token}`;
    window.open(url, '_blank');

  }
  goToNLPCohort() {
    // Logic to navigate to the cohort selection
    let token = localStorage.getItem('access_token');
    let userId = localStorage.getItem('user_id');
    const url = `https://cohort-builder-idea4rc.duckdns.org/?user_id=${userId}&analysis_id=${this.analysisId}&permit_id=${this.permitId}&workspace_id=${this.workspaceId}&access_token=${token}`;
    window.open(url, '_blank');

  }

  executeQuery(cohort: Cohort) {
    this.loading = true;            

    this.dataAnalysisService.updateCohortsStatus(cohort.id, { status: 2 }).subscribe({
      next: (response) => {
        console.log('Cohort status updated to executing', response);
      },
      error: (error) => {
        console.error('Error updating cohort status', error);
      }
    });
     if (cohort.query_execution_id) {
       const url = `https://api.fcb.orchestrator.idea.lst.tfo.upm.es/execute/${cohort.query_execution_id}`;
       window.open(url, '_blank');
      /* setTimeout(() => {
         this.loading = false;         // hide spinner
         this.dataAnalysisService.getCohorts(this.analysisId as unknown as number);
         this.showNotification('green', 'Cohort executed successfully', 'bottom', 'center');
 
       }, 3000);*/
     }

    this.loading = false;

  }
  executeQueryV6(cohortId: number) {
    this.dataAnalysisService.executeQueryV6(cohortId).subscribe({
      next: (response) => {
        console.log('V6 Query executed successfully', response);
        this.dataAnalysisService.getCohorts(this.analysisId as unknown as number);

        this.showNotification('green', 'Cohort executed successfully', 'bottom', 'center');
      },
      error: (error) => {
        console.error('Error executing V6 query', error);
        this.showNotification('red', 'Error executing cohort', 'bottom', 'center');
      }
    });


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
  checkboxLabel(row?: Cohort): string {
    if (!row) {
      return `${this.isAllSelected() ? 'select' : 'deselect'} all`;
    }
    return `${this.selection.isSelected(row) ? 'deselect' : 'select'} row ${row.id + 1
      }`;
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
