
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
import { MatChipsModule } from '@angular/material/chips';

@Component({
  selector: 'app-analytic-selection',
  templateUrl: './analytic-selection.component.html',
  styleUrl: './analytic-selection.component.scss'
})
export class AnalyticSelectionComponent implements OnInit, OnDestroy {

  // Variable to store the current workspace ID from the route
  workspaceId: string | undefined;
  analysisId: string | undefined;

  // Observables algorithm
  observable_algorithm$ : Observable<any> | undefined;
  private algorithmSubscription: any;

  // Table components
  dataSource = new MatTableDataSource<Algorithm>();
  displayedColumns: string[] = ['id','algorithm_name', 'creation_date', 'update_date', 'action'];

  //Selection forms
  selectedMethod: string | null = null;
  selectedMethodInfo: string | null = null;
  methods = [
  {
    value: "crosstabulation",
    label: "Crosstabulation",
    info: "This algorithm computes a cross-table (contingency table) for two or more categorical variables. It returns a table of counts showing the frequency of each combination of categories."
  },
  {
    value: "kaplan-meier",
    label: "Kaplan-Meier",
    info: "The Kaplan-Meier estimator computes survival probabilities over time for one or more groups, typically used in time-to-event analysis."
  },
  {
    value: "chi-squared",
    label: "Chi-squared",
    info: "The Chi-squared test measures whether there is a significant association between two categorical variables by comparing observed and expected frequencies."
  },
  {
    value: "glm",
    label: "GLM",
    info: "The Generalized Linear Model (GLM) fits a linear model to data using a specified link function, allowing analysis of outcomes that are not normally distributed."
  },
  {
    value: "coxph",
    label: "CoxPH",
    info: "The Cox Proportional Hazards model estimates the relationship between survival time and explanatory variables, accounting for censored data."
  },
  {
    value: "log-rank-test",
    label: "Log-rank test",
    info: "The Log-rank test compares the survival distributions of two or more groups to determine if there are statistically significant differences."
  }
];

  variables: string[] = ['Metastasis', 'Site of SFT', 'Variable 3', 'Variable 4'];
  selectedVariables: string[] = [];
  
  selection = new SelectionModel<any>(true, []);
  selectAlhorithm = false;

  @ViewChild(MatSort) sort!: MatSort;
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @Output() nextStep = new EventEmitter<void>();
  @Output() previousStep = new EventEmitter<void>();
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
    this.observable_algorithm$ = this.dataAnalysisService.algorithm
    // Subscribe to the observable patients
    this.algorithmSubscription = this.observable_algorithm$.subscribe((data) => {
      this.dataSource.data = data;
    });
    this.dataAnalysisService.getAlgorithms(1); // TODO Pass the analysis ID here
  }

  ngAfterViewInit() {
    // Set the paginator and sort for the data source
    this.dataSource.sort = this.sort;
    this.dataSource.paginator = this.paginator;
  }

  ngOnDestroy(): void {
    // Unsubscribe from the observable to prevent memory leaks
    if (this.algorithmSubscription) {
      this.algorithmSubscription.unsubscribe();
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
    // Show the container to select an algorithm
    this.selectAlhorithm = true;
  }
  goBackAlgorithms() {
    this.selectAlhorithm = false;
  }
  openAlgorithm(algorithm_id: number) {
  }
  deleteAlgorithm(algorithm_id: number) {
  }

  // Functions of algorithm selection section
  onMethodChange(value: string) {
    const method = this.methods.find(m => m.value === value);
    this.selectedMethodInfo = method ? method.info : null;
  }
  onVariablesSelected(value: any) {
  }
  removeVariable(variable: string) {
    const index = this.selectedVariables.indexOf(variable);
    if (index >= 0) {
      this.selectedVariables.splice(index, 1);
      // Trigger Angular change detection to update the <mat-select>
      this.selectedVariables = [...this.selectedVariables];
    }
  }

  saveAlgorithm() {
    // Logic to save the selected algorithm and variables
    console.log('Saving algorithm:', this.selectedMethod);
    console.log('Selected variables to include:', this.selectedVariables);
  }
  
  goBack() {
    this.previousStep.emit();
  }
  


}
