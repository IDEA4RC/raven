
import { Component, EventEmitter, OnDestroy, OnInit, Output, ViewChild } from '@angular/core';
import { DataAnalysisService } from '../../data-analysis.service';
import { MatSort } from '@angular/material/sort';
import { MatPaginator } from '@angular/material/paginator';
import { Algorithm } from './algorithm.model';
import { MatTableDataSource } from '@angular/material/table';
import { SelectionService } from '../selection.service';
import { SelectionModel } from '@angular/cdk/collections';
import { MatChipsModule } from '@angular/material/chips';
import { FormControl } from '@angular/forms';
import { firstValueFrom, interval, Observable, of, Subject } from 'rxjs';
import { catchError, map, switchMap, takeUntil, takeWhile } from 'rxjs/operators';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-analytic-selection',
  templateUrl: './analytic-selection.component.html',
  styleUrl: './analytic-selection.component.scss'
})
export class AnalyticSelectionComponent implements OnInit, OnDestroy {
  private readonly METHOD_CROSSTAB = 'crosstabulation';
  private readonly METHOD_KAPLAN_MEIER = 'kaplan-meier';
  private readonly METHOD_TTEST = 't-test';
  private readonly METHOD_TABLE1 = 'table1';
  private readonly METHOD_SUMMARY = 'summary';
  private readonly METHOD_GLM = 'glm';
  private readonly METHOD_COXPH = 'coxph';

  private readonly destroy$ = new Subject<void>();
  private readonly pollingReset$ = new Subject<void>();
  private readonly cohortChange$ = new Subject<void>();
  private activeCohortSignature = '';

  // Variable to store the current workspace ID from the route
  workspaceId: number | undefined;
  analysisId: number | undefined; pollingInterval: any;
  pollingFrequency: number = 3000; // 3 segundos
  // Observables algorithm

  // Table components
  dataSource = new MatTableDataSource<Algorithm>();
  displayedColumns: string[] = ['id', 'algorithm_name', 'input_variables', 'creation_date', 'update_date', 'status_task', 'action'];
  allCohorts: any[] = []; // Loaded from cohort selection
  algorithmsList: Algorithm[] = []
  //Selection forms
  selectedMethod: string | null = null;
  selectedMethodInfo: string | null = null;
  variableFilterCtrl = new FormControl('', { nonNullable: true });
  filteredVariables: any[] = [];
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
    /*{
      value: "chi-squared",
      label: "Chi-squared",
      info: "The Chi-squared test measures whether there is a significant association between two categorical variables by comparing observed and expected frequencies."
    },*/
    {
      value: "t-test",
      label: "T-test",
      info: "The T-test compares the means of two groups to determine if they are statistically different from each other, assuming normally distributed data."
    },
    {
      value: "table1",
      label: "Table 1",
      info: "This algorithm generates a summary table (Table 1) for descriptive statistics, typically used to present baseline characteristics of study groups."
    },
    {
      value: "glm",
      label: "GLM",
      info: "The Generalized Linear Model (GLM) fits a linear model to data using a specified link function, allowing analysis of outcomes that are not normally distributed."
    },
    {
      value: "coxph",
      label: "CoxPH",
      info: "The Cox Proportional Hazards model estimates the relationship between survival time and explanatory variables using censored data."
    },
    // {
    //   value: "log-rank-test",
    //   label: "Log-rank test",
    //   info: "The Log-rank test compares the survival distributions of two or more groups to determine if there are statistically significant differences."
    // },
    // {
    //   value: "time-delta",
    //   label: "Time Delta",
    //   info: ""
    // }
  ];

  // Kaplan-Meier selections
  selectedTimeColumn: string | null = null;
  selectedCensorColumn: string | null = null;
  selectedStrataColumn: string | null = null;

  // GLM selections
  selectedFamily: string | null = null;
  selectedPredictors: string[] = [];
  selectedOutcome: string | null = null;
  glmFamilies = ['gaussian', 'binomial', 'poisson', 'survival'];

  // CoxPH selections
  selectedCoxTimeColumn: string | null = null;
  selectedCoxOutcomeColumn: string | null = null;
  selectedCoxPredictors: string[] = [];

  //TODO get variables
  // Example: load data dynamically (could be from a service)
  loading = false;
  isLoading: boolean = true; // Para mostrar/hide el loader
  taskStatus: string = '';

  variables: { label: string; value: string; type: string, display_name: string }[] = [];

  selectedColumnVariable: string | null = null;
  selectedRowVariables: string[] = [];

  selection = new SelectionModel<any>(true, []);
  selectAlhorithm = false;
  private requestedView: string | null = null;
  private requestedAlgorithmId: number | null = null;
  private restoredAlgorithmId: number | null = null;

  @ViewChild(MatSort) sort!: MatSort;
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @Output() nextStep = new EventEmitter<void>();
  @Output() previousStep = new EventEmitter<void>();
  constructor(
    private activatedRoute: ActivatedRoute,
    private dataAnalysisService: DataAnalysisService,
    private router: Router,
    public selectionService: SelectionService
  ) { }

  ngOnInit(): void {
    this.initializeRouteState();
    this.initializeQueryParameterSubscription();
    this.initializeCohortSubscription();

    this.variableFilterCtrl.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(search => {
        this.filterVariables(search);
      });
  }

  private initializeRouteState(): void {
    const routeParams = this.activatedRoute.pathFromRoot.reduce(
      (params, route) => ({ ...params, ...route.snapshot.params }),
      {} as Record<string, string>
    );

    const workspaceId = Number(routeParams['id'] ?? routeParams['workspaceId']);
    const analysisId = Number(routeParams['analysisId']);

    if (!Number.isFinite(workspaceId) || workspaceId <= 0) {
      console.error('Workspace ID is not valid.');
      return;
    }

    if (!Number.isFinite(analysisId) || analysisId <= 0) {
      console.error('Analysis ID is not valid.');
      return;
    }

    this.workspaceId = workspaceId;
    this.analysisId = analysisId;
  }

  private initializeQueryParameterSubscription(): void {
    this.activatedRoute.queryParamMap
      .pipe(takeUntil(this.destroy$))
      .subscribe(queryParams => {
        this.requestedView = queryParams.get('view');

        const algorithmId = Number(queryParams.get('algorithmId'));
        this.requestedAlgorithmId =
          Number.isFinite(algorithmId) && algorithmId > 0 ? algorithmId : null;

        if (this.requestedView === 'new-algorithm') {
          this.selectAlhorithm = true;
        } else if (this.requestedView === 'algorithms') {
          this.selectAlhorithm = false;
        }

        if (this.algorithmsList.length) {
          this.restoreAlgorithmFromUrl();
        }
      });
  }

  private initializeCohortSubscription(): void {
    this.selectionService.selectedItems$
      .pipe(takeUntil(this.destroy$))
      .subscribe(items => {
        const newCohorts = Array.isArray(items) ? items : [];
        const newSignature = this.getCohortSignature(newCohorts);

        if (newSignature === this.activeCohortSignature) {
          return;
        }

        const hadPreviousCohorts = this.activeCohortSignature !== '';
        this.activeCohortSignature = newSignature;

        if (hadPreviousCohorts) {
          this.resetStateForCohortChange();
        }

        this.allCohorts = newCohorts;

        if (!this.allCohorts.length) {
          this.algorithmsList = [];
          this.dataSource.data = [];
          this.variables = [];
          this.filteredVariables = [];
          return;
        }

        this.getAlgorithmsList();
        this.loadVariablesForCurrentCohorts();
      });
  }

  private getCohortSignature(cohorts: any[]): string {
    return (cohorts || [])
      .map(cohort => String(cohort?.id ?? ''))
      .filter(Boolean)
      .sort()
      .join('|');
  }

  private resetStateForCohortChange(): void {
    this.cohortChange$.next();
    this.pollingReset$.next();

    this.selectionService.clearSelectedAlgorithm();

    this.restoredAlgorithmId = null;
    this.algorithmsList = [];
    this.dataSource.data = [];

    this.variables = [];
    this.filteredVariables = [];
    this.variableFilterCtrl.setValue('', { emitEvent: false });

    this.resetAlgorithmForm();
    this.selectAlhorithm = false;
  }

  private loadVariablesForCurrentCohorts(): void {
    const dataframeId = this.allCohorts
      .map(cohort => cohort?.dataframe_vantage_id)
      .find(id => id !== undefined && id !== null);

    if (!dataframeId) {
      this.variables = [];
      this.filteredVariables = [];
      return;
    }

    this.dataAnalysisService.getVariablesByDataframe(dataframeId)
      .pipe(
        takeUntil(this.cohortChange$),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (result: any) => {
          const seen = new Set<string>();

          this.variables = (result?.variablesList || [])
            .filter((variable: any) => {
              if (!variable?.name || seen.has(variable.name)) {
                return false;
              }

              seen.add(variable.name);
              return true;
            })
            .map((variable: any) => ({
              label: variable.name,
              value: variable.name,
              type: this.mapDatatype(variable.dtype),
              display_name: this.formatVariableName(variable.name)
            }));

          this.filteredVariables = [...this.variables];
          this.filterVariables(this.variableFilterCtrl.value);
        },
        error: error => {
          console.error('Error loading variables for current cohorts:', error);
          this.variables = [];
          this.filteredVariables = [];
        }
      });
  }

  ngAfterViewInit() {
    // Set the paginator and sort for the data source
    this.dataSource.sort = this.sort;
    this.dataSource.paginator = this.paginator;
  }

  ngOnDestroy(): void {
    this.cohortChange$.next();
    this.cohortChange$.complete();

    this.pollingReset$.next();
    this.pollingReset$.complete();

    this.destroy$.next();
    this.destroy$.complete();
  }


  // Search engine function to filter the table based on user input
  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filterPredicate = (data: Algorithm, filter: string) =>
      data.method_name.toLowerCase().includes(filter.trim().toLowerCase());
    this.dataSource.filter = filterValue.trim().toLowerCase();
    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
  }

  // Functions for buttons
  selectAlgorithm(): void {
    this.resetAlgorithmForm();
    this.selectAlhorithm = true;
    this.setUrlView('new-algorithm');
  }

  goBackAlgorithms(): void {
    this.resetAlgorithmForm();
    this.selectAlhorithm = false;
    this.setUrlView('algorithms');
  }

  openAlgorithm(algorithmId: number, updateUrl = true): void {
    const selectedAlgorithm = this.algorithmsList.find(algorithm => {
      return algorithm.id === algorithmId;
    });

    if (!selectedAlgorithm) {
      console.error(`Algorithm ${algorithmId} was not found.`);
      return;
    }

    this.resetAlgorithmForm();
    this.selectAlhorithm = false;

    this.selectionService.setSelectedAlgorithm({
      ...selectedAlgorithm,
      cohorts: this.allCohorts
    });

    if (updateUrl) {
      this.setUrlView('algorithm-results', algorithmId);
    }

    this.nextStep.emit();
  }

  deleteAlgorithm(algorithm: Algorithm) {
    // first confirm deletion with the user
    this.loading = true;
    const confirmed = confirm('Are you sure you want to delete this algorithm? This action cannot be undone.');
    if (!confirmed) {
      this.loading = false;
    }
    else {

      this.dataAnalysisService.deleteAlgorithm(algorithm.id).subscribe({
        next: () => {
          console.log(`Algorithm with ID ${algorithm.id} deleted successfully.`);
          this.algorithmsList = this.algorithmsList.filter(a => a.id !== algorithm.id);
          this.dataSource.data = this.getVisibleAlgorithms(this.algorithmsList);
          this.checkAlgorithmsStatus()

          this.loading = false;
        },
        error: (err) => {
          console.error("ERROR: 333333", err);
          this.loading = false;
        }
      });
    }

  }


  // Functions of algorithm selection section
  onMethodChange(value: string) {
    const method = this.methods.find(m => m.value === value);
    this.selectedMethodInfo = method ? method.info : null;

    if (!this.shouldShowVariableSelector()) {
      this.selectedColumnVariable = null;
      this.selectedRowVariables = [];
    }

    if (!this.shouldShowKaplanSelector()) {
      this.selectedTimeColumn = null;
      this.selectedCensorColumn = null;
      this.selectedStrataColumn = null;
    }

    if (!this.shouldShowGLMSelector()) {
      this.selectedFamily = null;
      this.selectedPredictors = [];
      this.selectedOutcome = null;
    }
  }
  onVariablesSelected(value: any) {
  }
  onSelectionChange(event: any) {
    void event;
  }
  removeVariable(variable: string) {
    const index = this.selectedRowVariables.indexOf(variable);
    if (index >= 0) {
      this.selectedRowVariables.splice(index, 1);
      // Trigger Angular change detection to update the <mat-select>
      this.selectedRowVariables = [...this.selectedRowVariables];
    }
  }

  onColumnVariableChange(variable: string | null): void {
    this.selectedColumnVariable = variable;
    if (!variable) {
      return;
    }

    if (this.selectedRowVariables.includes(variable)) {
      this.selectedRowVariables = this.selectedRowVariables.filter(rowVariable => rowVariable !== variable);
    }
  }

  getAvailableRowVariables() {
    const baseVariables = this.shouldShowVariableSelector()
      ? this.getCategoricalAndBooleanVariables()
      : this.variables;

    if (!this.selectedColumnVariable) {
      return baseVariables;
    }

    return baseVariables.filter(variable => variable.value !== this.selectedColumnVariable);
  }

  getVariableLabel(variableValue: string): string {
    const variable = this.variables.find(v => v.value === variableValue);
    return variable ? variable.display_name : variableValue;

  }

  saveAlgorithm() {
    // Logic to save the selected algorithm and variables
    if (this.loading) return;
    this.loading = true;
    console.log('Saving algorithm with method:', this.selectedMethod);
    if (!this.selectedMethod) {
      console.error('No analysis method selected');
      this.loading = false;
      return;
    }

    if (this.selectedMethod === this.METHOD_CROSSTAB) {
      this.createCrosstabRequest();
      return;
    }

    if (this.selectedMethod === this.METHOD_KAPLAN_MEIER) {
      this.createKaplanMeierRequest();
      return;
    }

    if (this.selectedMethod === this.METHOD_TTEST) {
      this.createTTestRequest();
      return;
    }

    if (this.selectedMethod === this.METHOD_TABLE1) {
      this.createTable1Request();
      return;
    }

    if (this.selectedMethod === this.METHOD_GLM) {
      this.createGLMRequest();
      return;
    }

    if (this.selectedMethod === this.METHOD_COXPH) {
      this.createCoxPHRequest();
      return;
    }
    console.error('Method not supported yet:', this.selectedMethod);
    this.loading = false;
  }

  shouldShowVariableSelector(): boolean {
    return this.selectedMethod === this.METHOD_CROSSTAB;
  }

  shouldShowKaplanSelector(): boolean {
    return this.selectedMethod === this.METHOD_KAPLAN_MEIER;
  }

  shouldShowGLMSelector(): boolean {
    return this.selectedMethod === this.METHOD_GLM;
  }

  /**
   * Returns true if family has been selected for GLM
   */
  isGLMFamilySelected(): boolean {
    return this.shouldShowGLMSelector() && this.selectedFamily !== null;
  }

  /**
   * Get allowed outcome variable types based on selected family
   */
  getAllowedOutcomeTypes(): string[] {
    switch (this.selectedFamily) {
      case 'gaussian':
        return ['number', 'float', 'int', 'int64', 'float64'];
      case 'binomial':
        return ['bool', 'boolean', 'categorical'];
      case 'poisson':
        return ['number', 'int', 'int64'];
      case 'survival':
        return ['number', 'float', 'int', 'int64', 'float64'];
      default:
        return [];
    }
  }

  /**
   * Get allowed predictor variable types based on selected family
   * Predictors can be any type except bool/boolean
   */
  getAllowedPredictorTypes(): string[] {
    // Predictors can be any type except boolean for consistency
    return ['number', 'float', 'int', 'int64', 'float64', 'categorical', 'string'];
  }

  /**
   * Get outcome variables filtered by family type
   */
  getOutcomeVariables(): any[] {
    const allowedTypes = this.getAllowedOutcomeTypes();
    if (allowedTypes.length === 0) {
      return [];
    }
    return this.getFilteredBaseVariables().filter(variable => {
      const type = (variable.type || '').toLowerCase();
      return allowedTypes.some(allowed => type.includes(allowed.toLowerCase()));
    });
  }

  /**
   * Get predictor variables filtered by family type
   */
  getPredictorVariables(): any[] {
    const allowedTypes = this.getAllowedPredictorTypes();
    if (allowedTypes.length === 0) {
      return this.variables;
    }
    return this.getFilteredBaseVariables().filter(variable => {
      const type = (variable.type || '').toLowerCase();
      return allowedTypes.some(allowed => type.includes(allowed.toLowerCase()));
    });
  }

  /**
   * Get help text for outcome variable based on family
   */
  getOutcomeHelpText(): string {
    switch (this.selectedFamily) {
      case 'gaussian':
        return 'Outcome: Numerical (int64 or float64)';
      case 'binomial':
        return 'Outcome: Boolean';
      case 'poisson':
        return 'Outcome: Integer (int64)';
      case 'survival':
        return 'Outcome: Numerical';
      default:
        return '';
    }
  }

  shouldShowNoVariableParams(): boolean {
    return this.selectedMethod === this.METHOD_TTEST || this.selectedMethod === this.METHOD_TABLE1;
  }

  getCategoricalVariables() {
    return this.getFilteredBaseVariables()
      .filter(variable => (variable.type || '').toLowerCase() === 'categorical');
  }

  getNumericVariables() {
    return this.getFilteredBaseVariables()
      .filter(variable => {
        const type = (variable.type || '').toLowerCase();
        return type === 'number' || type === 'float';
      });
  }

  getDateVariables() {
    return this.getFilteredBaseVariables()
      .filter(variable => (variable.type || '').toLowerCase() === 'date');
  }

  getBooleanVariables() {
    return this.getFilteredBaseVariables()
      .filter(variable => (variable.type || '').toLowerCase() === 'boolean');
  }

  getCategoricalAndBooleanVariables() {
    return this.getFilteredBaseVariables()
      .filter(variable => {
        const type = (variable.type || '').toLowerCase();

        return type === 'categorical' || type === 'boolean';
      });
  }

  getTimeAndDateVariables() {
    return this.getFilteredBaseVariables()
      .filter(variable => {
        const type = (variable.type || '').toLowerCase();
        return type === 'date' || type === 'number' || type === 'float';
      });
  }
  private getBaseAlgorithmRequestBody() {
    const cohortsIds = this.allCohorts.map(cohort => cohort.id);
    return {
      workspace_id: this.workspaceId,
      analysis_id: this.analysisId,
      cohorts_ids: cohortsIds
    };
  }

  private handleAlgorithmCreationSuccess(): void {
    this.resetAlgorithmForm();
    this.selectAlhorithm = false;
    this.loading = false;
    this.setUrlView('algorithms');
    this.getAlgorithmsList();
  }

  private handleAlgorithmCreationError(err: any): void {
    console.error('Error creando algoritmo:', err);
    this.loading = false;
  }

  private setUrlView(view: string | null, algorithmId?: number): void {
    this.router.navigate([], {
      relativeTo: this.activatedRoute,
      queryParams: {
        view,
        algorithmId: algorithmId ?? null
      },
      queryParamsHandling: 'merge',
      replaceUrl: true
    });
  }



  createTTestRequest() {
    const dataApplication = this.getBaseAlgorithmRequestBody();
    this.dataAnalysisService.createT_tableRequest(dataApplication).subscribe({
      next: () => this.handleAlgorithmCreationSuccess(),
      error: (err) => this.handleAlgorithmCreationError(err)
    });
  }

  createTable1Request() {
    const dataApplication = this.getBaseAlgorithmRequestBody();

    console.log("dataApplication", dataApplication);
    this.dataAnalysisService.createTable1Request(dataApplication).subscribe({
      next: () => this.handleAlgorithmCreationSuccess(),
      error: (err) => this.handleAlgorithmCreationError(err)
    });
  }

  createKaplanMeierRequest() {
    if (!this.selectedTimeColumn || !this.selectedCensorColumn) {
      console.error('Time column and censor column are required for Kaplan-Meier');
      this.loading = false;
      return;
    }

    const dataApplication = {
      ...this.getBaseAlgorithmRequestBody(),
      time_column_name: this.selectedTimeColumn,
      censor_column_name: this.selectedCensorColumn,
      strata_column_name: this.selectedStrataColumn || null
    };

    this.dataAnalysisService.createKaplanMeier(dataApplication).subscribe({
      next: () => this.handleAlgorithmCreationSuccess(),
      error: (err) => this.handleAlgorithmCreationError(err)
    });
  }

  createGLMRequest() {
    if (!this.selectedFamily || this.selectedPredictors.length === 0 || !this.selectedOutcome) {
      console.error('Family, at least one predictor, and outcome variable are required for GLM');
      this.loading = false;
      return;
    }

    const dataApplication = {
      ...this.getBaseAlgorithmRequestBody(),
      family: this.selectedFamily,
      predictor_variables: this.selectedPredictors,
      outcome_variable: this.selectedOutcome
    };

    this.dataAnalysisService.createGLM(dataApplication).subscribe({
      next: () => this.handleAlgorithmCreationSuccess(),
      error: (err) => this.handleAlgorithmCreationError(err)
    });
  }

  createCoxPHRequest() {
    // Basic presence validation
    if (!this.selectedCoxTimeColumn || !this.selectedCoxOutcomeColumn || this.selectedCoxPredictors.length === 0) {
      console.error('Time column, outcome column, and at least one explanatory variable are required for CoxPH');
      this.loading = false;
      return;
    }

    // Type validation: ensure time is numeric or date
    const timeVar = this.variables.find(v => v.value === this.selectedCoxTimeColumn);
    const outcomeVar = this.variables.find(v => v.value === this.selectedCoxOutcomeColumn);

    const timeType = (timeVar?.type || '').toLowerCase();
    if (!(timeType === 'date' || timeType === 'number' || timeType === 'float')) {
      console.error('Selected time column must be a numeric or date variable');
      this.loading = false;
      return;
    }

    // Outcome must be boolean
    const outcomeType = (outcomeVar?.type || '').toLowerCase();
    if (outcomeType !== 'boolean') {
      console.error('Selected outcome column must be a boolean variable');
      this.loading = false;
      return;
    }

    // Predictors: allow numeric/float/int/categorical/string types
    const allowedPredictorTypes = ['number', 'float', 'int', 'int64', 'float64', 'categorical', 'string'];
    for (const pred of this.selectedCoxPredictors) {
      const predVar = this.variables.find(v => v.value === pred);
      const ptype = (predVar?.type || '').toLowerCase();
      const ok = allowedPredictorTypes.some(t => ptype.includes(t));
      if (!ok) {
        console.error(`Predictor variable ${pred} has unsupported type: ${predVar?.type}`);
        this.loading = false;
        return;
      }
    }

    // Build payload, include optional organizations_to_include if set on component
    const dataApplication: any = {
      ...this.getBaseAlgorithmRequestBody(),
      time_col: this.selectedCoxTimeColumn,
      outcome_col: this.selectedCoxOutcomeColumn,
      expl_vars: this.selectedCoxPredictors
    };

    // If the component has an organizations_to_include field (optional UI), include it
    if ((this as any).organizations_to_include && Array.isArray((this as any).organizations_to_include)) {
      dataApplication.organizations_to_include = (this as any).organizations_to_include;
    }

    this.dataAnalysisService.createCoxPH(dataApplication).subscribe({
      next: () => this.handleAlgorithmCreationSuccess(),
      error: (err) => this.handleAlgorithmCreationError(err)
    });
  }

  goBack(): void {
    this.resetAlgorithmForm();
    this.selectAlhorithm = false;
    this.selectionService.clearSelectedAlgorithm();
    this.setUrlView(null);
    this.previousStep.emit();
  }

  getAlgorithmsList(): void {
    if (!this.allCohorts.length) {
      this.algorithmsList = [];
      this.dataSource.data = [];
      return;
    }

    this.pollingReset$.next();

    const cohortIds = this.allCohorts.map(cohort => cohort.id);
    const body = { cohort_ids: cohortIds };

    this.dataAnalysisService.getAlgorithmsListPostService(body)
      .pipe(
        takeUntil(this.cohortChange$),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: result => {
          this.algorithmsList = Array.isArray(result) ? result : [];
          this.dataSource.data = this.getVisibleAlgorithms(this.algorithmsList);

          this.checkAlgorithmsStatus();
          this.restoreAlgorithmFromUrl();
        },
        error: error => {
          console.error('Error loading algorithms for current cohorts:', error);
          this.algorithmsList = [];
          this.dataSource.data = [];
        }
      });
  }

  /*checkAlgoritmsStatus() {
    clearInterval(this.pollingInterval);
    // Limpiar cualquier polling previo
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
    }
  
    this.pollingInterval = setInterval(() => {
      console.log("SET INTERVAL");
  
      this.algorithmsList.forEach((algorithm: any, index: number) => {
        console.log("Algoritm: ", algorithm, " index : ", index);
  
        let status = algorithm.status_task
        let taskId = algorithm.task_id
  
        this.startPollingTaskStatus(taskId, status, index)
  
  
  
        /* this.dataAnalysisService.getTaskStatus(taskId).subscribe({
           next: (res: { status: string }) => {
             if (status != res.status) {
               let bodyUpdateAlgorithm =
               {
                 "task_id": taskId,
                 "status_task": res.status,
               }
               this.dataAnalysisService.updateAlgorithmsStatus(bodyUpdateAlgorithm).subscribe({
                 next: updateTaskResult => {
                   console.log("updateAlgorithmsStatus: ", updateTaskResult);
                   this.algorithmsList[index] = updateTaskResult
                   this.dataSource.data = this.algorithmsList
                 },
                 error: err => console.error('Error updateAlgorithmsStatus', err)
               });
   
   
             }
             if (status === 'completed' || status === 'crashed') {
               clearInterval(this.pollingInterval);
             }
           }
         });*/
  /*});
  }, this.pollingFrequency);
  }*/

  private restoreAlgorithmFromUrl(): void {
    if (
      this.requestedView !== 'algorithm-results' ||
      !this.requestedAlgorithmId ||
      this.restoredAlgorithmId === this.requestedAlgorithmId
    ) {
      return;
    }

    const requestedAlgorithm = this.algorithmsList.find(algorithm => {
      return algorithm.id === this.requestedAlgorithmId;
    });

    if (!requestedAlgorithm) {
      console.error(`Algorithm ${this.requestedAlgorithmId} was not found.`);
      this.setUrlView('algorithms');
      return;
    }

    this.restoredAlgorithmId = this.requestedAlgorithmId;
    this.openAlgorithm(this.requestedAlgorithmId, false);
  }



  mapDatatype(dtype: string): string {

    if (!dtype) return 'String';

    if (dtype.startsWith('dictionary')) {
      return 'Categorical';
    }

    if (dtype.startsWith('timestamp')) {
      return 'Date';
    }

    if (dtype.includes('int')) {
      return 'Number';
    }

    if (dtype.includes('double') || dtype.includes('float')) {
      return 'Float';
    }

    if (dtype.includes('bool')) {
      return 'Boolean';
    }

    return 'String';
  }

  createCrosstabRequest() {
    if (!this.selectedColumnVariable) {
      console.error('Crosstabulation requires selecting one column variable');
      this.loading = false;
      return;
    }

    if (this.selectedRowVariables.length === 0) {
      console.error('Crosstabulation requires at least one row variable');
      this.loading = false;
      return;
    }

    const baseRequest = this.getBaseAlgorithmRequestBody();
    const variablesList = [this.selectedColumnVariable, ...this.selectedRowVariables];

    let dataApplication = {
      ...baseRequest,
      "variablesList": variablesList,
      "results_col": this.selectedColumnVariable,
      "group_cols": this.selectedRowVariables
    }

    console.log("dataAplication", dataApplication);

    this.dataAnalysisService.createCrosstabRequest(dataApplication).subscribe({
      next: () => this.handleAlgorithmCreationSuccess(),
      error: (err) => this.handleAlgorithmCreationError(err)
    });
  }

  /*startPollingTaskStatus(taskId: number, task_status: string, index: number) {
  
    this.dataAnalysisService.getTaskStatus(taskId).subscribe({
      next: (res: { status: string }) => {
        if (task_status != res.status) {
          let bodyUpdateAlgorithm =
          {
            "task_id": taskId,
            "status_task": res.status,
          }
          this.dataAnalysisService.updateAlgorithmsStatus(bodyUpdateAlgorithm).subscribe({
            next: updateTaskResult => {
              console.log("updateAlgorithmsStatus: ", updateTaskResult);
              this.algorithmsList[index] = updateTaskResult
              this.dataSource.data = this.getVisibleAlgorithms(this.algorithmsList)
            },
            error: err => console.error('Error updateAlgorithmsStatus', err)
          });
        }
        console.log("Estado del task:", res.status);
  
        // Si está completo o falló, detenemos el polling
        if (this.taskStatus === 'completed') {
  
          this.fetchTaskResult(taskId);
  
          // Primero obtenemos el subtask
          this.dataAnalysisService.getSubTask(taskId).subscribe({
            next: (subtaskNumber: any) => {
              const subtaskId = Number(subtaskNumber); // <-- convertimos a número
  
              let bodyUpdateAlgorithm =
              {
                "task_id": taskId,
                "subtask_id": subtaskId,
                "status_subtask": "completed"
              }
              this.dataAnalysisService.updateAlgorithmsStatus(bodyUpdateAlgorithm).subscribe({
                next: updateTaskResult => {
                  console.log("updateTaskResult subtask: ", updateTaskResult);
  
                },
                error: err => console.error('Error updateTaskResult', err)
              });
              // Ahora obtenemos el resultado del subtask
              this.dataAnalysisService.getSubTaskResults(subtaskId).subscribe({
                next: subtaskResult => {
                  console.log("Result get subTaskREsults", subtaskResult);
                  console.log("Object.keys(subtaskResult.result)[0]", Object.keys(subtaskResult)[0]);
  
                  let bodyUpdateAlgorithm =
                  {
                    "task_id": taskId,
                    "subtask_id": subtaskId,
                    "status_subtask": "completed"
                  }
                  this.dataAnalysisService.updateAlgorithmsStatus(bodyUpdateAlgorithm).subscribe({
                    next: updateTaskResult => {
                      console.log("updateTaskResult subtask: ", updateTaskResult);
  
                    },
                    error: err => console.error('Error updateTaskResult', err)
                  });
  
                },
                error: err => console.error('Error fetching subtask result', err)
              });
            },
            error: err => console.error('Error fetching subtask number', err)
          });
        }
  
  
        return res.status
      },
      error: (err) => {
        console.error("Error consultando el status:", err);
        return "Error2"
      }
    });
  
  
  }*/

  fetchTaskResult(taskId: number) {
    this.dataAnalysisService.getTaskResult(taskId).subscribe({
      next: (result) => {
        const numericMapped: any = {};
        const countsMapped: any = {};
        const categoricalCount: any = {};
        const summary: any[] = [];


        let resultGlobal = result.result;
        console.log("Result global : ", resultGlobal);
      },
      error: (err) => {
        console.error("Error obteniendo el resultado de la tarea:", err);
      }
    });
  }


  checkAlgorithmsStatus(): void {
    this.pollingReset$.next();

    this.algorithmsList
      .filter(algorithm => {
        const status = String(algorithm?.status_task || '').toLowerCase();

        return status !== 'completed' &&
          status !== 'crashed' &&
          status !== 'killed by user' &&
          !!algorithm?.task_id;
      })
      .forEach(algorithm => {
        const taskId = algorithm.task_id;

        interval(this.pollingFrequency)
          .pipe(
            takeUntil(this.pollingReset$),
            takeUntil(this.destroy$),
            switchMap(() => {
              return this.dataAnalysisService.getTaskStatus(taskId).pipe(
                catchError(error => {
                  console.error(`Error loading status for task ${taskId}:`, error);
                  return of({ status: 'error' });
                })
              );
            }),
            takeWhile(response => {
              const status = String(response?.status || '').toLowerCase();

              return status !== 'completed' &&
                status !== 'crashed' &&
                status !== 'killed by user';
            }, true)
          )
          .subscribe(response => {
            this.updateAlgorithmStatusFromPolling(algorithm, response);
          });
      });
  }

  private async updateAlgorithmStatusFromPolling(
    algorithm: any,
    response: { status: string }
  ): Promise<void> {
    const taskId = algorithm.task_id;
    const status = String(response?.status || '');

    const currentAlgorithm = this.algorithmsList.find(item => {
      return item.task_id === taskId;
    });

    if (!currentAlgorithm || currentAlgorithm.status_task === status) {
      return;
    }

    currentAlgorithm.status_task = status;
    this.dataSource.data = this.getVisibleAlgorithms(this.algorithmsList);

    try {
      const updatedAlgorithm = await firstValueFrom(
        this.dataAnalysisService.updateAlgorithmsStatus({
          task_id: taskId,
          status_task: status
        })
      );

      this.algorithmsList = this.algorithmsList.map(item => {
        return item.task_id === taskId ? updatedAlgorithm : item;
      });

      this.dataSource.data = this.getVisibleAlgorithms(this.algorithmsList);

      if (status === 'completed' && algorithm.method_name === this.METHOD_SUMMARY) {
        await this.handleSubtask(algorithm);
      }
    } catch (error) {
      console.error(`Error updating status for task ${taskId}:`, error);
    }
  }

  async handleSubtask(algorithm: any) {
    const taskId = algorithm.task_id;

    try {
      // 1️⃣ Obtener subtaskId
      const subtaskNumber = await this.dataAnalysisService.getSubTask(taskId).toPromise();
      const subtaskId = Number(subtaskNumber);

      // 2️⃣ Actualizar subtask status
      const bodySubtaskUpdate = {
        task_id: taskId,
        subtask_id: subtaskId,
        status_subtask: 'completed'
      };
      const updatedAlgSubtask = await this.dataAnalysisService.updateAlgorithmsStatus(bodySubtaskUpdate).toPromise();
      this.algorithmsList = this.algorithmsList.map(a =>
        a.task_id === taskId ? updatedAlgSubtask : a
      );
      this.dataSource.data = this.getVisibleAlgorithms(this.algorithmsList);

      // 3️⃣ Obtener resultados del subtask
      const subtaskResult = await this.dataAnalysisService.getSubTaskResults(subtaskId).toPromise();
      console.log('Subtask result:', subtaskResult);

    } catch (err) {
      console.error('Error handling subtask', err);
    }
  }

  getVisibleAlgorithms(algorithms: any[]): any[] {
    return (algorithms || []).filter(algorithm => algorithm?.method_name !== this.METHOD_SUMMARY);
  }

  canShowOpen(algorithm: any): boolean {
    return (algorithm?.status_task || '').toLowerCase() === 'completed';
  }

  canShowDelete(algorithm: any): boolean {
    return (algorithm?.status_task || '').toLowerCase() === 'completed' || (algorithm?.status_task || '').toLowerCase() === 'crashed' || (algorithm?.status_task || '').toLowerCase() === 'killed by user';
  }

  private resetAlgorithmForm(): void {
    this.selectedMethod = null;
    this.selectedMethodInfo = null;

    this.selectedColumnVariable = null;
    this.selectedRowVariables = [];

    this.selectedTimeColumn = null;
    this.selectedCensorColumn = null;
    this.selectedStrataColumn = null;

    this.selectedFamily = null;
    this.selectedPredictors = [];
    this.selectedOutcome = null;

    this.selectedCoxTimeColumn = null;
    this.selectedCoxOutcomeColumn = null;
    this.selectedCoxPredictors = [];

    this.loading = false;
  }

  filterVariables(search: string) {
    const filterValue = (search || '').toLowerCase().trim();

    if (!filterValue) {
      this.filteredVariables = [...this.variables];
      return;
    }

    this.filteredVariables = this.variables.filter(variable => {
      const variableName = String(variable.label || '').toLowerCase();
      const displayName = String(variable.display_name || '').toLowerCase();
      return (
        variableName.includes(filterValue) ||
        displayName.includes(filterValue)
      );
    });

    //this.groupVariables(this.filteredVariables);
  }

  private formatVariableName(name: string): string {
    if (!name) return '';

    // 1. reemplazar _
    let formatted = name.replace(/_/g, ' ');

    // 2. minúsculas + capitalizar palabras
    formatted = formatted.toLowerCase().replace(/\b\w/g, char => char.toUpperCase());

    return formatted;
  }

  private getFilteredBaseVariables(): any[] {
    return this.variableFilterCtrl.value
      ? this.filteredVariables
      : this.variables;
  }

  onVariableSelectOpened(opened: boolean): void {
    if (opened) {
      this.variableFilterCtrl.setValue('');
      this.filteredVariables = [...this.variables];
    }
  }
}
