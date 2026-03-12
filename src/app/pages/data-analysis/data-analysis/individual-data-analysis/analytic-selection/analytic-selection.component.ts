
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
import { interval, forkJoin, of } from 'rxjs';
import { switchMap, takeWhile, catchError, map } from 'rxjs/operators';

@Component({
  selector: 'app-analytic-selection',
  templateUrl: './analytic-selection.component.html',
  styleUrl: './analytic-selection.component.scss'
})
export class AnalyticSelectionComponent implements OnInit, OnDestroy {
  private readonly METHOD_CROSSTAB = 'crosstabulation';
  private readonly METHOD_TTEST = 't-test';
  private readonly METHOD_TABLE1 = 'table1';
  private readonly METHOD_SUMMARY = 'summary';

  // Variable to store the current workspace ID from the route
  workspaceId: number | undefined;
  analysisId: number | undefined; pollingInterval: any;
  pollingFrequency: number = 3000; // 3 segundos
  // Observables algorithm
  observable_algorithm$: Observable<any> | undefined;
  private algorithmSubscription: any;

  // Table components
  dataSource = new MatTableDataSource<Algorithm>();
  displayedColumns: string[] = ['id', 'algorithm_name', 'creation_date', 'update_date', 'status_task', 'action'];
  allCohorts: any[] = []; // Loaded from cohort selection
  algorithmsList: Algorithm[] = []
  //Selection forms
  selectedMethod: string | null = null;
  selectedMethodInfo: string | null = null;
  methods = [
    {
      value: "crosstabulation",
      label: "Crosstabulation",
      info: "This algorithm computes a cross-table (contingency table) for two or more categorical variables. It returns a table of counts showing the frequency of each combination of categories."
    },
    // {
    //   value: "kaplan-meier",
    //   label: "Kaplan-Meier",
    //   info: "The Kaplan-Meier estimator computes survival probabilities over time for one or more groups, typically used in time-to-event analysis."
    // },
    /* {
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
    }
    // {
    //   value: "glm",
    //   label: "GLM",
    //   info: "The Generalized Linear Model (GLM) fits a linear model to data using a specified link function, allowing analysis of outcomes that are not normally distributed."
    // },
    // {
    //   value: "coxph",
    //   label: "CoxPH",
    //   info: "The Cox Proportional Hazards model estimates the relationship between survival time and explanatory variables, accounting for censored data."
    // },
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

  //TODO get variables
  // Example: load data dynamically (could be from a service)
  variables = [
    { "value": "LOCAL_RECURRENCE", "label": "Local Recurrence", "type": "categorical" }
    /*{ "value": "MULTIFOCALITY", "label": "Multifocality", "type": "categorical" },
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
    { "value": "SEX", "label": "Sex", "type": "categorical" }*/
  ];
  loading = false;
  isLoading: boolean = true; // Para mostrar/hide el loader
  taskStatus: string = '';


  selectedColumnVariable: string | null = null;
  selectedRowVariables: string[] = [];

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



    this.selectionService.selectedItems$.subscribe(items => {
      this.allCohorts = items;
      if (!this.allCohorts || this.allCohorts.length === 0) {
        return;
      }

      const cohortDataframeIds = this.allCohorts.map(cohort => cohort.dataframe_vantage_id);
      if (!cohortDataframeIds[0]) {
        return;
      }

      this.dataAnalysisService.getVariablesByDataframe(cohortDataframeIds[0]).subscribe({
        next: (variables: any) => {
          const seen = new Set<string>();
          this.variables = variables.variablesList
            .filter((v: any) => {
              if (seen.has(v.name)) return false;
              seen.add(v.name);
              return true;
            })
            .map((v: any) => ({
              label: v.name,
              value: v.name,
              type: this.mapDatatype(v.dtype)
            }));
          console.log("variables: ", this.variables);

        },

        error: err => console.error('Error fetching subtask number', err)
      });

      console.log("Selected service .selectedItems$ in onInit of analytic selection ", items);
    });
    const urlSegments = this.router.url.split('/');
    const workspaceIndex = urlSegments.indexOf('workspace');
    const dataAnalysisIndex = urlSegments.indexOf('data-analysis');

    if (workspaceIndex !== -1 && urlSegments.length > workspaceIndex + 1) {

      this.workspaceId = Number(urlSegments[workspaceIndex + 1]);
      this.analysisId = Number(urlSegments[dataAnalysisIndex + 1]);
      if (isNaN(this.workspaceId)) {
        console.error('Workspace ID no es un número válido');
        return;
      }
    }

    this.getAlgorithmsList()
    // Get the observable from the service
    this.observable_algorithm$ = this.dataAnalysisService.algorithm

    // Subscribe to the observable patients
    this.algorithmSubscription = this.observable_algorithm$.subscribe((data) => {
      this.dataSource.data = this.getVisibleAlgorithms(data || []);
    });
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
      data.method_name.toLowerCase().includes(filter.trim().toLowerCase());
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
    console.log("algorithm id: ", algorithm_id);
    
    // Obtener el algoritmo seleccionado de la lista
    const selectedAlgorithm = this.algorithmsList.find(alg => alg.id === algorithm_id);
    
    if (selectedAlgorithm) {
      // Pasar el algoritmo a través del servicio
      this.selectionService.setSelected([selectedAlgorithm]);
      console.log("Selected algorithm:", selectedAlgorithm);
    }
    
    this.nextStep.emit();
  }
  deleteAlgorithm(algorithm_id: number) {
  }

  // Functions of algorithm selection section
  onMethodChange(value: string) {
    const method = this.methods.find(m => m.value === value);
    this.selectedMethodInfo = method ? method.info : null;

    if (!this.shouldShowVariableSelector()) {
      this.selectedColumnVariable = null;
      this.selectedRowVariables = [];
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
    if (!this.selectedColumnVariable) {
      return this.variables;
    }

    return this.variables.filter(variable => variable.value !== this.selectedColumnVariable);
  }

  getVariableLabel(variableValue: string): string {
    const variable = this.variables.find(v => v.value === variableValue);
    return variable ? variable.label : variableValue;
  }

  saveAlgorithm() {
    // Logic to save the selected algorithm and variables
    this.loading = true;

    if (!this.selectedMethod) {
      console.error('No analysis method selected');
      this.loading = false;
      return;
    }

    if (this.selectedMethod === this.METHOD_CROSSTAB) {
      this.createCrosstabRequest();
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

    console.error('Method not supported yet:', this.selectedMethod);
    this.loading = false;
  }

  shouldShowVariableSelector(): boolean {
    return this.selectedMethod === this.METHOD_CROSSTAB;
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
    this.getAlgorithmsList();
    this.selectAlhorithm = false;
    this.loading = false;
  }

  private handleAlgorithmCreationError(err: any): void {
    console.error('Error creando algoritmo:', err);
    this.loading = false;
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
    this.dataAnalysisService.createTable1Request(dataApplication).subscribe({
      next: () => this.handleAlgorithmCreationSuccess(),
      error: (err) => this.handleAlgorithmCreationError(err)
    });

  }

  goBack() {
    this.previousStep.emit();
  }

  getAlgorithmsList() {
    const cohortsIds = this.allCohorts.map(cohort => cohort.id);
    console.log("cohorts id:", cohortsIds);

    let body = {
      cohort_ids: cohortsIds
    }
    this.dataAnalysisService.getAlgorithmsList(body).subscribe({
      next: (result) => {
        console.log("result getAlgorithmsList: ", result);
        this.algorithmsList = result
        this.dataSource.data = this.getVisibleAlgorithms(this.algorithmsList);
        this.checkAlgorithmsStatus()
      },
      error: (err) => {
        console.error("Error creando summary statistics:", err);
      }
    });
  }

  checkAlgoritmsStatus() {
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
      });
    }, this.pollingFrequency);
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

  startPollingTaskStatus(taskId: number, task_status: string, index: number) {

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


  }

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
    this.algorithmsList.forEach((algorithm: any, index: number) => {
      console.log("Algoritm: ", algorithm, " index : ", index);

      const taskId = algorithm.task_id;

      interval(this.pollingFrequency)
        .pipe(
          switchMap(() => this.dataAnalysisService.getTaskStatus(taskId).pipe(
            catchError(err => {
              console.error('Error fetching task status', err);
              return of({ status: 'error' });
            })
          )),
          takeWhile(res => res.status !== 'completed' && res.status !== 'crashed', true),
          map(res => ({ res, index }))
        )
        .subscribe(async ({ res, index }) => {

          const currentAlg = this.algorithmsList[index];

          // Actualizamos status principal si cambió
          if (currentAlg.status_task !== res.status) {
            currentAlg.status_task = res.status;

            const updateBody = { task_id: taskId, status_task: res.status };
            try {
              const updatedAlg = await this.dataAnalysisService.updateAlgorithmsStatus(updateBody).toPromise();
              this.algorithmsList[index] = updatedAlg;
              this.dataSource.data = this.getVisibleAlgorithms(this.algorithmsList);
            } catch (err) {
              console.error('Error updating main task status', err);
            }

            if (res.status === 'completed' && algorithm.method_name === "summary" ) {
            this.handleSubtask(algorithm, index);
          }

          if (res.status === 'crashed') {
            console.error(`Task ${taskId} crashed`);
          }
          }

          // Si task completado, hacer polling de subtask y resultados
          
        });

    });
  }

  async handleSubtask(algorithm: any, index: number) {
    const taskId = algorithm.task_id;

    try {
      // 1️⃣ Obtener subtaskId
      const subtaskNumber = await this.dataAnalysisService.getSubTask(taskId).toPromise();
      const subtaskId = Number(subtaskNumber);
      console.log("subtaskId: ",subtaskId);
      
      // 2️⃣ Actualizar subtask status
      const bodySubtaskUpdate = {
        task_id: taskId,
        subtask_id: subtaskId,
        status_subtask: 'completed'
      };
      const updatedAlgSubtask = await this.dataAnalysisService.updateAlgorithmsStatus(bodySubtaskUpdate).toPromise();
      this.algorithmsList[index] = updatedAlgSubtask;
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

  canShowAction(algorithm: any): boolean {
    return (algorithm?.status_task || '').toLowerCase() === 'completed';
  }
}
