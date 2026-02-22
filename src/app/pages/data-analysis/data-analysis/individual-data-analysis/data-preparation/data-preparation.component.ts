import { Component, EventEmitter, OnDestroy, OnInit, Output, ViewChild } from '@angular/core';
import { forkJoin, Observable } from 'rxjs';
import { DataAnalysisService } from '../../data-analysis.service';
import { Router } from '@angular/router';
import { SelectionService } from '../selection.service';
import { MatTableDataSource } from '@angular/material/table';
import { HttpClient } from '@angular/common/http';
import { MatDialog } from '@angular/material/dialog';
import { CreateVariableDialogComponent } from '../create-variable-dialog/create-variable-dialog.component';

@Component({
  selector: 'app-data-preparation',
  templateUrl: './data-preparation.component.html',
  styleUrl: './data-preparation.component.scss'
})
export class DataPreparationComponent implements OnInit, OnDestroy {

  @Output() nextStep = new EventEmitter<void>();
  @Output() previousStep = new EventEmitter<void>();

  // Variable to store the current workspace ID from the route
  workspaceId: number | undefined;
  analysisId: number | undefined;

  allCohorts: any[] = []; // Loaded from cohort selection
  allCenters: any[] = [] // Loaded from cohort selection
  optionsVariables: { variable_name: string; variable_id: string, datatype: string }[] = []; // Loaded from metadata search


  taskStatus: string = ''; // Por ejemplo: "pending", "running", "complete", "failed"
  isLoading: boolean = true; // Para mostrar/hide el loader
  isCrashed: boolean = false;

  pollingInterval: any;
  pollingFrequency: number = 3000; // 3 segundos
  // Variables for the filters
  selectedCenters: any[] = [];
  selectedCohorts: any[] = [];

  showCenters = true;
  showCohorts = true;
  variableList: any[] = [];
  summaryStatisticsCohorts: any[] = [];
  summaryStatisticsCenters: any[] = [];
  summaryTableCat: any[] = [
    { Statistics: 'N', field: "count", Total: 0 },
    { Statistics: 'Missing', field: "missing", Total: 0 }
  ];
  summaryTableNum: any[] = [
    { Statistics: 'N', field: "count" },
    { Statistics: 'Mean', field: "mean" },
    { Statistics: 'Min', field: "min" },
    { Statistics: 'Max', field: "max" },
    { Statistics: 'Missing', field: "missing" },
  ];

  // Object to show the summary statistics by center
  centersTables: any = {};

  currentTaskId: number
  // Variable bound to the selected value
  selectedValue: { variable_name: string; variable_id: string; datatype: string; variable_description: string };


  // Table components
  dataSourceCohorts = new MatTableDataSource<any>();
  displayedColumnsCohorts: string[] = [];

  dataSourceCenters = new MatTableDataSource<any>();
  displayedColumnsCenters: string[] = [];

  // Observables cohort
  observable_coes_granted$: Observable<any> | undefined;
  observable_data_preparation_cohort$: Observable<any> | undefined;
  observable_data_preparation_center$: Observable<any> | undefined;
  private coesGrantedSubscription: any;
  private dataPreparationSubscriptionCohort: any;
  private dataPreparationSubscriptionCenter: any;

  constructor(
    private dataAnalysisService: DataAnalysisService,
    private router: Router,
    private selectionService: SelectionService,
    private http: HttpClient,
    private dialog: MatDialog
  ) { }

  ngOnInit(): void {



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
    const dataAnalysisIndex = urlSegments.indexOf('data-analysis');

    if (workspaceIndex !== -1 && urlSegments.length > workspaceIndex + 1) {

      this.workspaceId = Number(urlSegments[workspaceIndex + 1]);
      this.analysisId = Number(urlSegments[dataAnalysisIndex + 1]);
      if (isNaN(this.workspaceId)) {
        console.error('Workspace ID no es un número válido');
        return;
      }

      forkJoin({
        coes: this.dataAnalysisService.getDataPermitByWorkspace(this.workspaceId),
        variables: this.dataAnalysisService.getVariablesGranted(this.workspaceId),
        metadata: this.http.get<any[]>('./assets/jsons/metadata_v0.3.json')
      }).subscribe({
        next: ({ coes, variables, metadata }) => {
          if (!coes) {
            console.warn('No data returned from permits API');
            this.allCenters = [];
            this.optionsVariables = [];
            return;
          }

          if (!variables) {
            console.warn('No data returned from metadata API');
            this.allCenters = [];
            this.optionsVariables = [];
            return;
          }


          const firstRecord = coes[0];
          this.allCenters = firstRecord.coes_granted || [];

          const grantedVariableIds: string[] = variables.id_variables || [];

          this.optionsVariables = metadata.filter(v => grantedVariableIds.includes(v.variable_id));


          this.createSummaryRequest()


        },
        error: (err) => {
          console.error('Error loading workspace metadata:', err);
          this.allCenters = [];
          this.optionsVariables = [];
        }
      });
    } else {
      console.error('Workspace not found in URL segments');
    }


    // Subscribe to the observable from the service
    this.selectionService.selectedItems$.subscribe(items => {
      this.allCohorts = items;

      // TODO: Aquí puedes hacer cualquier cosa con los datos
    });

    this.observable_data_preparation_cohort$ = this.dataAnalysisService.data_preparation_cohort
    this.observable_data_preparation_center$ = this.dataAnalysisService.data_preparation_center


    // Subscribe to the observable data preparation by cohort
    this.dataPreparationSubscriptionCohort = this.observable_data_preparation_cohort$.subscribe((data: any) => {
      this.summaryStatisticsCohorts = data;
      this.updateCohortsTable();
    });
    // Subscribe to the observable data preparation by center
    this.dataPreparationSubscriptionCenter = this.observable_data_preparation_center$.subscribe((data: any) => {
      this.summaryStatisticsCenters = data;
      this.updateCentersTable();
    });


    // this.dataAnalysisService.getSummaryStatisticsCohort(this.allCohorts);
    // this.dataAnalysisService.getSummaryStatisticsCenter(this.allCenters);
  }

  ngOnDestroy(): void {
    // Unsubscribe from the observable to prevent memory leaks
    if (this.dataPreparationSubscriptionCohort) {
      this.dataPreparationSubscriptionCohort.unsubscribe();
    }
    if (this.dataPreparationSubscriptionCenter) {
      this.dataPreparationSubscriptionCenter.unsubscribe();
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
    console.log("Selected value", this.selectedValue);

    this.updateCohortsTable();
    this.updateCentersTable();

  }


  updateCohortsTable() {
    if (!this.selectedValue) return;
    // Update the cohorts table based on the selected variable
    let variableCohorts: any[] = [];

    const variableName = this.selectedValue.variable_name;
    const variableId = this.selectedValue.variable_id;
    const variableType = this.selectedValue.datatype;

    // Reset displayed columns
    this.displayedColumnsCohorts = [];
    this.dataSourceCohorts.data = [];

    if (this.selectedValue.datatype === 'Label') {
      this.displayedColumnsCohorts.push(variableName);
      console.log("summaryStatisticsCohorts", this.summaryStatisticsCohorts);

      this.summaryStatisticsCohorts.forEach((statistic: any, index: number) => {
        const variableData = statistic.rps_cohort?.counts_unique_values?.[variableId] || {};
        const cohortLabel = `Cohort ${index + 1}`;
        this.displayedColumnsCohorts.push(cohortLabel);
        const variableValues = Object.keys(variableData).filter(v => v !== 'N/A');

        //const variableData = statistic.rps_cohort?.counts_unique_values?.[this.selectedValue.variable_id];

        //this.displayedColumnsCohorts.push(`Cohort ${index + 1}`);
        console.log("Variable Data for Cohort", cohortLabel, variableData);
        console.log("variableValues: ", variableValues);

        variableValues.forEach((val: string, i: number) => {
          if (variableCohorts.length <= i) {
            // Crear nueva fila
            variableCohorts.push({
              [variableName]: val,
              [cohortLabel]: variableData[val]
            });
          } else {
            // Actualizar fila existente
            variableCohorts[i][cohortLabel] = variableData[val];
          }
        });
      });

      // === Add Total and Missing rows ===
      const totalRow: any = { [variableName]: 'Total' };
      const missingRow: any = { [variableName]: 'Missing' };

      // Compute totals and missings per cohort
      this.displayedColumnsCohorts.slice(1).forEach((cohortLabel: string, index: number) => {
        const variableData = this.summaryStatisticsCohorts[index].rps_cohort?.counts_unique_values?.[variableId] || {};
        let total = 0;
        let missing = 0;

        Object.entries(variableData).forEach(([key, value]: [string, any]) => {
          if (key === 'N/A') missing += value;
          else total += value;
        });

        const totalPlusMissing = total + missing;
        const missingPerc = totalPlusMissing > 0 ? (missing / totalPlusMissing) * 100 : 0;

        totalRow[cohortLabel] = total;
        missingRow[cohortLabel] = `${missing} (${missingPerc.toFixed(1)}%)`;
      });

      // Add summary rows at the end
      variableCohorts.push(totalRow);
      variableCohorts.push(missingRow);


    } else if (this.selectedValue.datatype === 'Number') {
      variableCohorts = this.summaryTableNum

      this.displayedColumnsCohorts.push('Statistics');
      this.summaryStatisticsCohorts.forEach((statistic: any, index: number) => {
        const variableData = statistic.rps_cohort[this.selectedValue.datatype][this.selectedValue.variable_id];
        this.displayedColumnsCohorts.push(`Cohort ${index + 1}`);

        variableCohorts = variableCohorts.map((row: any) => {
          const cohortValue = variableData[row.field] || 0;

          // Keep existing cohorts and add the new one dynamically
          return {
            ...row,
            [`Cohort ${index + 1}`]: cohortValue
          };
        });

      });
    }

    // Update the data source for the cohorts table
    this.dataSourceCohorts.data = variableCohorts;
    this.dataSourceCohorts._updateChangeSubscription();
  }

  updateCentersTable() {
    // Update the centers table based on the selected variable
    if (this.selectedValue) {
      let variableCenters: any[] = [];
      if (this.selectedValue.datatype === 'categorical') {
        // Reset displayed columns
        this.displayedColumnsCenters = [];
        this.dataSourceCenters.data = [];
        // Add Statistics as first column
        this.displayedColumnsCenters.push(this.selectedValue.variable_name);

        let centersTable: any = {};

        let cohorts = Object.keys(this.summaryStatisticsCenters[0]);

        cohorts.forEach((cohort: any, index: number) => {
          variableCenters = [];

          let centers = Object.keys(this.summaryStatisticsCenters[0][cohort]);
          // Add center names to displayed columns (only once)
          if (index === 0) {
            this.displayedColumnsCenters.push(...centers);
          }

          // === Build variable rows per cohort ===
          centers.forEach((center: any) => {
            const variableData =
              this.summaryStatisticsCenters[0][cohort][center]["counts_unique_values"][this.selectedValue.variable_id];

            const variableValues = Object.keys(variableData);

            variableValues.forEach((val: any) => {
              // Skip 'N/A' entries — will handle later in Missing
              if (val === "N/A") return;

              if (variableCenters.length < variableValues.length - (variableValues.includes("N/A") ? 1 : 0)) {
                let row = {
                  [this.selectedValue.variable_name]: val,
                  [center]: variableData[val],
                };
                variableCenters.push(row);
              } else {
                variableCenters = variableCenters.map((row: any) => {
                  if (row[this.selectedValue.variable_name] === val) {
                    row = { ...row, [center]: variableData[val] };
                  }
                  return row;
                });
              }
            });
          });

          // === Add Total and Missing rows ===
          const totalRow: any = { [this.selectedValue.variable_name]: "Total" };
          const missingRow: any = { [this.selectedValue.variable_name]: "Missing" };

          centers.forEach((center: any) => {
            const variableData =
              this.summaryStatisticsCenters[0][cohort][center]["counts_unique_values"][this.selectedValue.variable_id];

            let total = 0;
            let missing = 0;

            Object.entries(variableData).forEach(([key, value]: [string, any]) => {
              if (key === "N/A") missing += value;
              else total += value;
            });

            const totalPlusMissing = total + missing;
            const missingPerc = totalPlusMissing > 0 ? (missing / totalPlusMissing) * 100 : 0;

            totalRow[center] = total;
            missingRow[center] = `${missing} (${missingPerc.toFixed(1)}%)`;
          });

          // Append summary rows at the end
          variableCenters.push(totalRow);
          variableCenters.push(missingRow);

          // Save this cohort's centers table
          centersTable[cohort] = variableCenters;
        });
        this.centersTables = centersTable;
      } else
        if (this.selectedValue.datatype === 'numeric') {

          // Reset displayed columns
          this.displayedColumnsCenters = [];
          this.dataSourceCenters.data = [];
          // Add Statistics as first column
          this.displayedColumnsCenters.push('Statistics');

          let centersTable: any = {};

          let cohorts = Object.keys(this.summaryStatisticsCenters[0]);

          cohorts.forEach((cohort: any, index: number) => {
            let variableCenters = [...this.summaryTableNum];
            let centers = Object.keys(this.summaryStatisticsCenters[0][cohort]);
            if (index === 0) {
              this.displayedColumnsCenters.push(...centers);
            }

            centers.forEach((center: any) => {
              const variableData =
                this.summaryStatisticsCenters[0][cohort][center][this.selectedValue.datatype][this.selectedValue.variable_id];

              variableCenters = variableCenters.map((row: any) => {
                const centerValue = variableData[row.field] || 0;
                return {
                  ...row,
                  [center]: centerValue,
                };
              });
            });

            // Save this centers' table
            centersTable[cohort] = variableCenters;
          });

          console.log(centersTable);
          this.centersTables = centersTable;

        }

    }
  }
  onCentersChange(): void {
    //   // Get only selected centers
    //   this.selectedCenters = this.allCenters
    //     .filter(center => center.selected)
    //     .map(center => center.name);

    //   // this.updateVariableCenters();
  }

  onCohortsChange(): void {
    //   // Get only selected cohorts
    //   this.selectedCohorts = this.allCohorts
    //     .filter(cohort => cohort.selected)
    //     .map(cohort => cohort.cohort_name);
    //     console.log(this.selectedCohorts);


    //   // this.updateVariableCenters();
  }

  createVariable() {
    // Logic to create a new variable
    console.log('Create Variable button clicked');
     const dialogRef = this.dialog.open(CreateVariableDialogComponent, {
    width: '600px',
    disableClose: true, // evita cerrar al clicar fuera
    data: {
      // si necesitas pasar algo (centers, cohorts, etc.)
      centers: this.allCenters,
      cohorts: this.allCohorts
    }
  });
  dialogRef.afterClosed().subscribe(result => {
    if (result) {
      // aquí recibes la nueva variable creada
      console.log('Variable creada:', result);
      // refrescar lista de variables, llamar API, etc.
    }
  });
  }
  // Function to get the keys of an object
  objectKeys(data: any) {
    return Object.keys(data);
  }

  createSummaryRequest() {
    const cohortsIds = this.allCohorts.map(cohort => cohort.id);
    let dataApplication = {
      "workspace_id": this.workspaceId,
      "analysis_id": this.analysisId,
      "cohorts_ids": cohortsIds
    }
    this.dataAnalysisService.getSummaryStatisticsV6(dataApplication).subscribe({
      next: (result: { task_id: number; job_id: number }) => {

        let currentTaskID = result.task_id;
        this.startPollingTaskStatus(currentTaskID);

      },
      error: (err) => {
        console.error("Error creando summary statistics:", err);
      }
    });
  }


  startPollingTaskStatus(taskId: number) {
    this.currentTaskId = taskId;
    this.isLoading = true;
    this.taskStatus = 'pending';

    // Limpiar cualquier polling previo
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
    }

    this.pollingInterval = setInterval(() => {
      this.dataAnalysisService.getTaskStatus(this.currentTaskId!).subscribe({
        next: (res: { status: string }) => {
          this.taskStatus = res.status;
          console.log("Estado del task:", this.taskStatus);

          // Si está completo o falló, detenemos el polling
          if (this.taskStatus === 'completed' || this.taskStatus === 'crashed') {
            clearInterval(this.pollingInterval);
            this.isLoading = false;
            this.isCrashed = this.taskStatus === 'crashed';

            if (this.taskStatus === 'completed') {
              // Aquí puedes llamar a tu servicio que obtiene el resultado
              this.fetchTaskResult(this.currentTaskId!);
            } else {
              console.error("La tarea falló");
            }
          }
        },
        error: (err) => {
          console.error("Error consultando el status:", err);
        }
      });
    }, this.pollingFrequency);
  }

  fetchTaskResult(taskId: number) {

  }

}