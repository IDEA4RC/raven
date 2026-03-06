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
  variableMapping: { [localId: string]: string } = {
    'Patient_birthYear': 'year_of_birth',
    'Patient_id': 'patient_id',
    'Patient_sex': 'sex',
    'Morphology': 'morphology',
    'PatientFollowUp_newCancerTopography': 'topography',
    'Life_status': 'life_status',
    'Pathological_stage': 'pathological_stage',
    'Clinical_stage': 'clinical_stage'
  };
  @Output() nextStep = new EventEmitter<void>();
  @Output() previousStep = new EventEmitter<void>();

  // Variable to store the current workspace ID from the route
  workspaceId: number | undefined;
  analysisId: number | undefined;

  allCohorts: any[] = []; // Loaded from cohort selection
  allCenters: any[] = [] // Loaded from cohort selection
  optionsVariables: { variable_name: string; variable_id: string, datatype: string }[] = []; // Loaded from metadata search


  taskStatus: string = '';
  isLoading: boolean = true; // Para mostrar/hide el loader
  isCrashed: boolean = false;
  resultGlobal: any = [];
  cohortNames: string;
  resultLocal: any = [];
  pollingInterval: any;
  pollingFrequency: number = 3000; // 3 segundos
  // Variables for the filters
  selectedCenters: any[] = [];
  selectedCohorts: any[] = [];
  nodeData: any
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
  //TODO: selectedValue: { variable_name: string; variable_id: string; datatype: string; variable_description: string };
  selectedValue: any = null;


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
        variables: this.dataAnalysisService.getMetadataByWorkspace(this.workspaceId),
        //metadata: this.http.get<any[]>('./assets/jsons/metadata_v0.3.json')
      }).subscribe({
        next: ({ coes, variables }) => {//, metadata }) => {

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
          console.log("all centers length: ", this.allCenters.length);

          if (!this.allCenters.length) {
            console.warn('No COES granted for this workspace');
            this.allCenters = [];
            this.optionsVariables = [];
            return;
          }
          else {
            this.createSummaryRequest();
          }
          const grantedVariableIds: string[] = variables.id_variables || [];
          // this.optionsVariables = metadata.filter(v => grantedVariableIds.includes(v.variable_id));
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
      const cohortDataframeIds = this.allCohorts.map(cohort => cohort.dataframe_vantage_id);


      this.dataAnalysisService.getVariablesByDataframe(cohortDataframeIds[0]).subscribe({
        next: (variables: any) => {
          const seen = new Set<string>();
          this.optionsVariables = variables.variablesList
            .filter((v: any) => {
              if (seen.has(v.name)) return false;
              seen.add(v.name);
              return true;
            })
            .map((v: any) => ({
              variable_name: v.name,
              variable_id: v.name,
              datatype: this.mapDatatype(v.dtype)
            }));

        },
        error: err => console.error('Error fetching subtask number', err)
      });
    });

    this.observable_data_preparation_cohort$ = this.dataAnalysisService.data_preparation_cohort
    this.observable_data_preparation_center$ = this.dataAnalysisService.data_preparation_center


    // Subscribe to the observable data preparation by cohort
    this.dataPreparationSubscriptionCohort = this.observable_data_preparation_cohort$.subscribe((data: any) => {
      console.log("dataPreparationSubscriptionCohort", data);

      this.summaryStatisticsCohorts = data;
      this.updateCohortsTable();
    });
    // Subscribe to the observable data preparation by center
    this.dataPreparationSubscriptionCenter = this.observable_data_preparation_center$.subscribe((data: any) => {
      console.log("dataPreparationSubscriptionCenter", data);
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
    if (this.selectedValue) {
      this.processResultLocal();
    }
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

    console.log("Updating cohorts table for variable:", variableName, "of type:", variableType);

    // Reset displayed columns
    this.displayedColumnsCohorts = [];
    this.dataSourceCohorts.data = [];

    if (this.selectedValue.datatype === 'Categorical') {
      console.log("summary cohorts: ", this.summaryStatisticsCohorts);
      const totalRow: any = { [variableName]: 'Total' };
      const missingRow: any = { [variableName]: 'Missing' };
      this.displayedColumnsCohorts.push(variableName);

      this.summaryStatisticsCohorts.forEach((statistic: any, index: number) => {
        console.log("statistics :", statistic, " index :", index);

        const variableData = statistic.rps_cohort?.counts_unique_values?.[variableId] || {};
        const cohortLabel = `Cohort ${index + 1}`;
        const variableCounts = statistic.rps_cohort?.categorical_count?.[variableId] || {};
        this.displayedColumnsCohorts.push(cohortLabel);
        const variableValues = Object.keys(variableData);
        console.log("variableCounts ", variableCounts);

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

        let total = variableCounts['count'] || 0;
        let missing = variableCounts['missing'] || 0;
        const missingPerc = total > 0 ? (missing / total) * 100 : 0;

        totalRow[cohortLabel] = total

        missingRow[cohortLabel] = `${variableCounts['missing']} (${missingPerc.toFixed(1)}%)`;



      });
      variableCohorts.push(totalRow);
      variableCohorts.push(missingRow);
      // === Add Total and Missing rows ===


      // Compute totals and missings per cohort
      /*this.displayedColumnsCohorts.slice(1).forEach((cohortLabel: string, index: number) => {
        const variableData = this.summaryStatisticsCohorts[index].rps_cohort?.counts_unique_values?.[variableId] || {};
        console.log("variable data for cohort", cohortLabel, variableData);

        let total = 0;
        let missing = 0;

        Object.entries(variableData).forEach(([key, value]: [string, any]) => {
          console.log("Processing key:", key, "with value:", value);
          if (key === 'N/A') missing += value;
          else total += value;
        });

        const totalPlusMissing = total + missing;




      });
*/
      // Add summary rows at the end


    } else if (this.selectedValue.datatype === 'Number') {
      variableCohorts = this.summaryTableNum;
      console.log("summary cohorts: ", this.summaryStatisticsCohorts);

      this.displayedColumnsCohorts.push('Statistics');
      this.summaryStatisticsCohorts.forEach((statistic: any, index: number) => {
        const variableData = statistic.rps_cohort?.numeric?.[this.selectedValue.variable_id];
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
      /* else if (this.selectedValue.datatype === 'Number') {
   
         variableCohorts = this.summaryTableNum;
   
         this.displayedColumnsCohorts.push('Statistics');
         console.log("variableCohorts", variableCohorts);
         console.log("summaryStatisticsCohorts", this.summaryStatisticsCohorts);
   
         this.summaryStatisticsCohorts.forEach((statistic: any, index: number) => {
           console.log("Processing statistic for index:", index, statistic);
   
           // Aquí se accede al nuevo backend manteniendo los nombres originales
           const variableData =
             statistic.rps_cohort?.numeric?.[this.selectedValue.variable_id];
   
           this.displayedColumnsCohorts.push(`Cohort ${index + 1}`);
   
           variableCohorts = variableCohorts.map((row: any) => {
   
             // Para median, q_25 y q_75 que son objetos { root, INT }
             const rawValue = variableData?.[row.field];
             const cohortValue =
               typeof rawValue === 'object' && rawValue !== null
                 ? rawValue.root
                 : rawValue ?? 0;
   
             return {
               ...row,
               [`Cohort ${index + 1}`]: cohortValue
             };
           });
   
           console.log("variableCohorts after mapping:", variableCohorts);
         });*/
    }
    // Update the data source for the cohorts table
    this.dataSourceCohorts.data = variableCohorts;
    this.dataSourceCohorts._updateChangeSubscription();
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


  updateCentersTable() {
    // Update the centers table based on the selected variable
    if (this.selectedValue) {
      let variableCenters: any[] = [];
      if (this.selectedValue.datatype === 'Categorical') {
        console.log("centersCategorical: ", this.summaryStatisticsCenters);

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
          console.log("centers", centers);

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


              if (variableCenters.length < variableValues.length) {
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

    let currentTaskID = 850; // ID de tarea simulado para testing el otro 825
    this.startPollingTaskStatus(currentTaskID);
    /*this.dataAnalysisService.getSummaryStatisticsV6(dataApplication).subscribe({
      next: (result: { task_id: number; job_id: number }) => {
  
        let currentTaskID = result.task_id;
        currentTaskID = 822
        this.startPollingTaskStatus(currentTaskID);
  
      },
      error: (err) => {
        console.error("Error creando summary statistics:", err);
      }
    });*/
  }


  startPollingTaskStatus(taskId: number) {
    clearInterval(this.pollingInterval);

    this.currentTaskId = taskId;
    this.isLoading = true;
    this.taskStatus = 'pending';

    // Limpiar cualquier polling previo
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
    }

    this.pollingInterval = setInterval(() => {
      this.dataAnalysisService.getTaskStatus(taskId).subscribe({
        next: (res: { status: string }) => {
          this.taskStatus = res.status;
          console.log("Estado del task:", this.taskStatus);

          // Si está completo o falló, detenemos el polling
          if (this.taskStatus === 'completed') {
            clearInterval(this.pollingInterval);
            this.fetchTaskResult(taskId);
            this.isLoading = false;
            this.isCrashed = false;
            // Primero obtenemos el subtask
            this.dataAnalysisService.getSubTask(taskId).subscribe({
              next: (subtaskNumber: any) => {
                const subtaskId = Number(subtaskNumber); // <-- convertimos a número
                // Ahora obtenemos el resultado del subtask
                this.dataAnalysisService.getSubTaskResults(subtaskId).subscribe({
                  next: subtaskResult => {
                    console.log("Result get subTaskREsults", subtaskResult);
                    console.log("Object.keys(subtaskResult.result)[0]", Object.keys(subtaskResult)[0]);

                    this.resultLocal = subtaskResult;
                    this.processResultLocal();
                  },
                  error: err => console.error('Error fetching subtask result', err)
                });
              },
              error: err => console.error('Error fetching subtask number', err)
            });
          }
          else if (this.taskStatus === 'crashed') {
            clearInterval(this.pollingInterval);
            this.isLoading = false;
            this.isCrashed = this.taskStatus === 'crashed';


            console.error("La tarea falló");

          }
        },
        error: (err) => {
          console.error("Error consultando el status:", err);
        }
      });
    }, this.pollingFrequency);
  }

  processResultLocal() {
    console.log("ProcessResultLocal", this.resultLocal);
    console.log("ProcessResultLocal - selectedValue", this.selectedValue);
    console.log("ProcessResultLocal - resultGlobal", this.resultGlobal);


    if (!this.resultGlobal || !this.resultLocal) return;


    if (!this.cohortNames) return;

    const numericMapped: any = {};
    const countsMapped: any = {};





    /*this.cohortNames.forEach(cohortName => {
      console.log("Cohort name", cohortName);
  
      const cohortData = this.resultLocal[cohortName];
      if (!cohortData || !cohortData.length) return;
  
      // Detectar variables numéricas y categóricas
      const variables = Object.keys(cohortData[0]?.numeric || {});
      const labelVariables = Object.keys(cohortData[0]?.label || {});
  
      // Aquí decides qué crear
      variables.forEach(variable => {
        console.log("Variable: ", variable);
  
        // this.createNumericTable(cohortData, variable, cohortName);
      });
  
      labelVariables.forEach(variable => {
        console.log("labelVariables :", variable);
  
        //this.createLabelTable(cohortData, variable, cohortName);
      });
    });*/
  }


  fetchTaskResult(taskId: number) {
    this.dataAnalysisService.getTaskResult(taskId).subscribe({
      next: (result) => {
        const numericMapped: any = {};
        const countsMapped: any = {};
        const categoricalCount: any = {};
        const summary: any[] = [];


        this.resultGlobal = result.result;
        console.log("Result global : ", this.resultGlobal);


        Object.keys(result.result).forEach(cohortName => {
          const nodeData = result.result[cohortName];

          this.optionsVariables.forEach(v => {
            // Para numeric (Number)

            const key = v.variable_id;


            if (nodeData.numeric && nodeData.numeric[key] !== undefined) {
              numericMapped[key] = nodeData.numeric[key];
            }
            // Para counts_unique_values (Label)
            if (nodeData.counts_unique_values && nodeData.counts_unique_values[key] !== undefined) {
              countsMapped[key] = nodeData.counts_unique_values[key];
            }
            // Para categorical_count (Categorical)
            if (nodeData.categorical && nodeData.categorical[key] !== undefined) {
              categoricalCount[key] = nodeData.categorical[key];
            }
          });

          summary.push({
            cohort_name: cohortName,
            rps_cohort: {
              numeric: numericMapped,
              counts_unique_values: countsMapped,
              categorical_count: categoricalCount
            }
          });


        }
        );

        this.summaryStatisticsCohorts = summary;


        console.log("result of summaryS: ", this.summaryStatisticsCohorts);


        this.updateCohortsTable();
        this.updateCentersTable();
      },
      error: (err) => {
        console.error("Error obteniendo el resultado de la tarea:", err);
      }
    });
  }


}