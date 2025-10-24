import { Component, EventEmitter, OnDestroy, OnInit, Output, ViewChild } from '@angular/core';
import { Observable } from 'rxjs';
import { DataAnalysisService } from '../data-analysis/data-analysis.service';
import { Router } from '@angular/router';
import { SelectionService } from '../data-analysis/selection.service';
import { MatTableDataSource } from '@angular/material/table';
@Component({
  selector: 'app-data-preparation',
  templateUrl: './data-preparation.component.html',
  styleUrl: './data-preparation.component.scss'
})
export class DataPreparationComponent implements OnInit, OnDestroy {
  
  @Output() nextStep = new EventEmitter<void>();
  @Output() previousStep = new EventEmitter<void>();

  // Variable to store the current workspace ID from the route
  workspaceId: string | undefined;
  analysisId: string | undefined;

  selectedCenters: any[] = ["APH P", "INT", "ISS-FJD"];
  selectedCohorts: any[] = [];
  showCenters = true;
  showCohorts = true;
  variableList: any[] = [];
  summaryStatisticsCohorts: any[] = [];
  summaryStatisticsCenters: any[] = [];
  summryTableCat : any[] = [
    { Statistics: 'N', field: "count", Total: 0},
    { Statistics: 'Missing', field: "missing", Total: 0 }
  ]
  summryTableNum: any[] = [
    { Statistics: 'N', field: "count", Total: 0},
    { Statistics: 'Median', field: "median", Total: 0 },
    { Statistics: 'Min', field: "min", Total: 0 },
    { Statistics: 'Max', field: "max", Total: 0 },
    { Statistics: 'Missing', field: "missing", Total: 0 },
    { Statistics: 'Q1 (25%)', field: "q_25", Total: 0 },
    { Statistics: 'Q3 (75%)', field: "q_75", Total: 0 },
    { Statistics: 'Sum', field: "sum", Total: 0 }
  ]
   

  // Variable bound to the selected value
  selectedValue: any = null;

  // Options loaded dynamically on the variables selection
  optionsVariables: { value: string; label: string, type: string }[] = [];

  // Table components
  dataSourceCohorts = new MatTableDataSource<any>();
  displayedColumnsCohorts: string[] = ['Statistics', 'Total', 'Cohort 1', 'Cohort 2'];

  dataSourceCenters = new MatTableDataSource<any>();
  displayedColumnsCenters: string[] = ['Statistics', 'Total', 'Cohort 1', 'Cohort 2'];

  // Observables cohort
  observable_data_preparation$ : Observable<any> | undefined;
  private dataPreparationSubscription: any;

  constructor(
      private dataAnalysisService: DataAnalysisService,
      private router: Router,
      private selectionService: SelectionService
  ) { }

  ngOnInit(): void {

    //TODO get variables
    // Example: load data dynamically (could be from a service)
    this.optionsVariables = [
      { "value": "AGE", "label": "Age", "type": "numeric" },
      { "value": "TUMOR_SIZE", "label": "Tumor Size", "type": "numeric" },
      { "value": "LOCAL_RECURRENCE", "label": "Local Recurrence", "type": "categorical" },
      { "value": "MULTIFOCALITY", "label": "Multifocality", "type": "categorical" },
      { "value": "STATUS", "label": "Status", "type": "categorical" },
      { "value": "PRE_OPERATIVE_RADIO", "label": "Pre Operative Radio", "type": "categorical" },
      { "value": "HISTOLOGY", "label": "Histology", "type": "categorical" },
      { "value": "POST_OPERATIVE_RADIO", "label": "Post Operative Radio", "type": "categorical" },
      { "value": "PRE_OPERATIVE_CHEMO", "label": "Pre Operative Chemo", "type": "categorical" },
      { "value": "POST_OPERATIVE_CHEMO", "label": "Post Operative Chemo", "type": "categorical" },
      { "value": "COMPLETENESS_OF_RESECTION", "label": "Completeness Of Resection", "type": "categorical" },
      { "value": "DISTANT_METASTASIS", "label": "Distant Metastasis", "type": "categorical" },
      { "value": "FNCLCC_GRADE", "label": "Fnclcc Grade", "type": "categorical" },
      { "value": "TUMOR_RUPTURE", "label": "Tumor Rupture", "type": "categorical" },
      { "value": "SEX", "label": "Sex", "type": "categorical" }
    ];


    this.dataSourceCohorts.data = [
      { Statistics: 'N', Total: 1500, 'Cohort 1': 800, 'Cohort 2': 700 },
      { Statistics: 'Mean', Total: 45.5, 'Cohort 1': 46.2, 'Cohort 2': 44.8 },
      { Statistics: 'Median', Total: 44, 'Cohort 1': 45, 'Cohort 2': 43 },
      { Statistics: 'Min', Total: 18, 'Cohort 1': 19, 'Cohort 2': 18 },
      { Statistics: 'Max', Total: 80, 'Cohort 1': 78, 'Cohort 2': 80 },
      { Statistics: 'Std Dev', Total: 12.3, 'Cohort 1': 11.8, 'Cohort 2': 12.7 }
    ];


    // Extract workspace ID from the current URL
    const urlSegments = this.router.url.split('/');
    const workspaceIndex = urlSegments.indexOf('workspace');    
    
    if (workspaceIndex !== -1 && urlSegments.length > workspaceIndex + 1) {
      this.workspaceId = urlSegments[workspaceIndex + 1];
    }

    // Subscribe to the observable from the service
    this.selectionService.selectedItems$.subscribe(items => {
      this.selectedCohorts = items;
      // Aquí puedes hacer cualquier cosa con los datos
      console.log(this.selectedCohorts);
    });

    this.observable_data_preparation$ = this.dataAnalysisService.data_preparation
    // Subscribe to the observable data preparation
    this.dataPreparationSubscription = this.observable_data_preparation$.subscribe((data) => {
      this.summaryStatisticsCohorts = data;
    });
    this.dataAnalysisService.getSummaryStatistics();
  }

  ngOnDestroy(): void {
    // Unsubscribe from the observable to prevent memory leaks
    if (this.dataPreparationSubscription) {
      this.dataPreparationSubscription.unsubscribe();
    }
  }
  
  goBack() {
    this.previousStep.emit();
  }
  goNext() {
    this.nextStep.emit();
  }
  onVariableSelected(value: any) {
    this.selectedValue = value;
    
    // console.log('Selected variable:', this.selectedValue);
    let variableCohorts: any[] = [];
    if(this.selectedValue.type === 'categorical'){
      variableCohorts = this.summryTableCat
    } else if(this.selectedValue.type === 'numeric'){
      variableCohorts = this.summryTableNum
    }
    this.summaryStatisticsCohorts.forEach((statistic: any, index: number) => {
      const variableData = statistic.rps_cohort[this.selectedValue.type][this.selectedValue.value];
      console.log(variableData);
      

      variableCohorts = variableCohorts.map((row: any) => {
        const cohortValue = variableData[row.field] || 0;
        const total = Number(((row["Total"] || 0) + cohortValue).toFixed(2));

        // Keep existing cohorts and add the new one dynamically
        return {
          ...row,
          Total: total,
          [`Cohort ${index + 1}`]: cohortValue
        };
      });
    
    });

   
    // Update the data source for the cohorts table
    this.dataSourceCohorts.data = variableCohorts;

  }
  createVariable() {
    // Logic to create a new variable
    console.log('Create Variable button clicked');
  }

}
