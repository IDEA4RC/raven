import { Component, EventEmitter, OnDestroy, OnInit, Output } from '@angular/core';
import { Observable } from 'rxjs';
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

  workspaceId: number | undefined;
  analysisId: number | undefined;

  allCohorts: any[] = [];
  allCenters: any[] = [];
  authorizedCenterLabels: string[] = [];
  centerFilters: Array<{ key: string; label: string; selected: boolean }> = [];
  cohortFilters: Array<{ key: string; label: string; selected: boolean }> = [];
  optionsVariables: { variable_name: string; variable_id: string; datatype: string }[] = [];

  taskStatus = '';
  isLoading = true;
  isCrashed = false;
  resultGlobal: any = [];
  resultLocal: any = [];
  pollingInterval: any;
  pollingFrequency = 3000;
  summaryFlowInitialized = false;

  // Track status details for each cohort
  cohortStatusMap: Map<string, { status: string; message: string; taskId?: number }> = new Map();

  selectedCenters: any[] = [];
  selectedCohorts: any[] = [];
  nodeData: any;
  showCenters = true;
  showCohorts = true;
  variableList: any[] = [];
  summaryStatisticsCohorts: any[] = [];
  summaryStatisticsCenters: any = {};

  summaryTableNum: any[] = [
    { Statistics: 'N', field: 'count' },
    { Statistics: 'Mean', field: 'mean' },
    { Statistics: 'Min', field: 'min' },
    { Statistics: 'Max', field: 'max' },
    { Statistics: 'Missing', field: 'missing' }
  ];

  centersTables: any = {};
  numericCenterCharts: Array<{ cohort: string; charts: Array<{ title: string; series: any[]; chart: any; xaxis: any; plotOptions: any; dataLabels: any; colors: string[] }> }> = [];

  currentTaskId: number;
  selectedValue: any = null;

  dataSourceCohorts = new MatTableDataSource<any>();
  displayedColumnsCohorts: string[] = [];

  dataSourceCenters = new MatTableDataSource<any>();
  displayedColumnsCenters: string[] = [];

  observable_coes_granted$: Observable<any> | undefined;
  observable_data_preparation_cohort$: Observable<any> | undefined;
  observable_data_preparation_center$: Observable<any> | undefined;
  private permitSubscription: any;
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

      this.observable_coes_granted$ = this.dataAnalysisService.permit$;
      this.permitSubscription = this.observable_coes_granted$.subscribe({
        next: (permitData: any) => {
          const permitCenterLabels = this.extractCenterLabelsFromPermitPayload(permitData);
          this.authorizedCenterLabels = permitCenterLabels;
          this.allCenters = permitCenterLabels;
          this.syncCenterFilters(this.authorizedCenterLabels);
          this.tryInitializeSummaryFlow();
        },
        error: (err) => {
          console.error('Error loading workspace permit:', err);
          this.allCenters = [];
          this.authorizedCenterLabels = [];
          this.centerFilters = [];
        }
      });

      this.dataAnalysisService.getPermitByWorkspaceId(String(this.workspaceId));
    } else {
      console.error('Workspace not found in URL segments');
    }

    this.selectionService.selectedItems$.subscribe(items => {
      this.allCohorts = items;
      this.syncCohortFilters();
      this.tryInitializeSummaryFlow();

      const cohortDataframeIds = this.allCohorts.map(cohort => cohort.dataframe_vantage_id);
      if (!cohortDataframeIds.length || !cohortDataframeIds[0]) {
        return;
      }

      this.dataAnalysisService.getVariablesByDataframe(cohortDataframeIds[0]).subscribe({
        next: (variables: any) => {
          console.log("Variables from server ", variables);
          console.log("Variables from server list", variables.variablesList);
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
        error: err => console.error('Error fetching dataframe variables', err)
      });
    });

    this.observable_data_preparation_cohort$ = this.dataAnalysisService.data_preparation_cohort;
    this.observable_data_preparation_center$ = this.dataAnalysisService.data_preparation_center;

    this.dataPreparationSubscriptionCohort = this.observable_data_preparation_cohort$.subscribe((data: any) => {
      this.summaryStatisticsCohorts = data;
      this.updateCohortsTable();
    });

    this.dataPreparationSubscriptionCenter = this.observable_data_preparation_center$.subscribe((data: any) => {
      this.summaryStatisticsCenters = data;
      this.updateCentersTable();
    });
  }

  ngOnDestroy(): void {
    if (this.permitSubscription) {
      this.permitSubscription.unsubscribe();
    }
    if (this.dataPreparationSubscriptionCohort) {
      this.dataPreparationSubscriptionCohort.unsubscribe();
    }
    if (this.dataPreparationSubscriptionCenter) {
      this.dataPreparationSubscriptionCenter.unsubscribe();
    }
  }

  goBack() {
    this.resetState();
    this.previousStep.emit();
  }

  private resetState(): void {
    clearInterval(this.pollingInterval);
    this.summaryFlowInitialized = false;
    this.isLoading = true;
    this.isCrashed = false;
    this.selectedValue = null;
    this.taskStatus = '';
    this.resultGlobal = [];
    this.resultLocal = [];
    this.summaryStatisticsCohorts = [];
    this.summaryStatisticsCenters = {};
    this.centersTables = {};
    this.numericCenterCharts = [];
    this.dataSourceCohorts.data = [];
    this.displayedColumnsCohorts = [];
    this.dataSourceCenters.data = [];
    this.displayedColumnsCenters = [];
    this.optionsVariables = [];
    this.cohortStatusMap.clear();
  }

  goNext() {
    this.nextStep.emit();
  }

  onVariableSelected(value: any) {
    this.selectedValue = value;

    if (this.selectedValue) {
      this.processResultLocal();
    }

    this.updateCohortsTable();
    this.updateCentersTable();
  }

  isNumericVariableType(datatype: string): boolean {
    return datatype === 'Number' || datatype === 'Float';
  }

  isNumericVariableSelected(): boolean {
    return !!this.selectedValue && this.isNumericVariableType(this.selectedValue.datatype);
  }

  updateCohortsTable() {
    if (!this.selectedValue) return;

    let variableCohorts: any[] = [];
    const variableName = this.selectedValue.variable_name;
    const variableId = this.selectedValue.variable_id;

    this.displayedColumnsCohorts = [];
    this.dataSourceCohorts.data = [];

    if (this.selectedValue.datatype === 'Categorical' || this.selectedValue.datatype === 'Boolean') {
      const totalRow: any = { [variableName]: 'Total' };
      const missingRow: any = { [variableName]: 'Missing' };
      this.displayedColumnsCohorts.push(variableName);

      this.summaryStatisticsCohorts.forEach((statistic: any, index: number) => {
        const variableData = statistic.rps_cohort?.counts_unique_values?.[variableId] || {};
        const cohortLabel = `Cohort ${index + 1}`;
        const variableCounts = statistic.rps_cohort?.categorical_count?.[variableId] || {};
        this.displayedColumnsCohorts.push(cohortLabel);

        Object.keys(variableData).forEach((val: string, i: number) => {
          if (variableCohorts.length <= i) {
            variableCohorts.push({
              [variableName]: val,
              [cohortLabel]: variableData[val]
            });
          } else {
            variableCohorts[i][cohortLabel] = variableData[val];
          }
        });

        const total = Number(variableCounts['count'] || 0);
        const missing = Number(variableCounts['missing'] || 0);
        const missingPerc = total > 0 ? (missing / total) * 100 : 0;

        totalRow[cohortLabel] = total;
        missingRow[cohortLabel] = `${missing} (${missingPerc.toFixed(1)}%)`;
      });

      variableCohorts.push(totalRow);
      variableCohorts.push(missingRow);
    } else if (this.isNumericVariableType(this.selectedValue.datatype)) {
      variableCohorts = this.summaryTableNum.map(row => ({ ...row }));
      this.displayedColumnsCohorts.push('Statistics');

      this.summaryStatisticsCohorts.forEach((statistic: any, index: number) => {
        const variableData = statistic.rps_cohort?.numeric?.[variableId] || {};
        const cohortLabel = `Cohort ${index + 1}`;
        this.displayedColumnsCohorts.push(cohortLabel);

        variableCohorts = variableCohorts.map((row: any) => {
          const rawValue = Number(variableData[row.field] ?? 0);
          return {
            ...row,
            [cohortLabel]: Number.isFinite(rawValue) ? Number(rawValue.toFixed(3)) : 0
          };
        });
      });
    }
    
    

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

    if (dtype.includes('int') || dtype.includes('double') || dtype.includes('float')) {
      return 'Number';
    }

    if (dtype.includes('bool')) {
      return 'Boolean';
    }



    return 'unknown';
  }

  updateCentersTable() {
    if (!this.selectedValue || !this.summaryStatisticsCenters || !Object.keys(this.summaryStatisticsCenters).length) {
      this.centersTables = {};
      this.displayedColumnsCenters = [];
      this.numericCenterCharts = [];
      return;
    }

    const variableId = this.selectedValue.variable_id;
    const variableName = this.selectedValue.variable_name;
    const selectedCenterKeys = new Set(this.centerFilters.filter(center => center.selected).map(center => center.key));
    const selectedCohortKeys = new Set(this.cohortFilters.filter(cohort => cohort.selected).map(cohort => cohort.key));
    const cohorts = Object.keys(this.summaryStatisticsCenters).filter(cohort => {
      return !selectedCohortKeys.size || selectedCohortKeys.has(cohort);
    });
    const centersTable: any = {};

    this.displayedColumnsCenters = [];

    if (this.selectedValue.datatype === 'Categorical') {
      this.displayedColumnsCenters = [variableName];

      cohorts.forEach((cohort, index) => {
        const cohortCenters = this.summaryStatisticsCenters[cohort] || {};
        const centers = this.getEffectiveCentersForCohort(cohortCenters, selectedCenterKeys);

        if (!centers.length) {
          return;
        }

        if (index === 0) {
          this.displayedColumnsCenters.push(...centers, 'Total');
        }

        const allCategories = new Set<string>();
        centers.forEach(center => {
          const variableCounts = cohortCenters[center]?.counts_unique_values?.[variableId] || {};
          Object.keys(variableCounts)
            .filter(category => category !== 'N/A')
            .forEach(category => allCategories.add(category));
        });

        const sortedCategories = Array.from(allCategories).sort();
        const rows: any[] = sortedCategories.map(category => ({
          [variableName]: category
        }));

        centers.forEach(center => {
          const variableCounts = cohortCenters[center]?.counts_unique_values?.[variableId] || {};
          rows.forEach(row => {
            const category = row[variableName];
            row[center] = variableCounts[category] ?? 0;
          });
        });

        rows.forEach(row => {
          row['Total'] = centers.reduce((sum, center) => sum + Number(row[center] || 0), 0);
        });

        const totalRow: any = { [variableName]: 'Total' };
        const missingRow: any = { [variableName]: 'Missing' };

        centers.forEach(center => {
          const variableCounts = cohortCenters[center]?.counts_unique_values?.[variableId] || {};
          const missing = Number(variableCounts['N/A'] || 0);
          const total = Object.entries(variableCounts)
            .filter(([category]) => category !== 'N/A')
            .reduce((sum, [, count]) => sum + Number(count || 0), 0);

          const denominator = total + missing;
          const missingPercent = denominator > 0 ? (missing / denominator) * 100 : 0;

          totalRow[center] = total;
          missingRow[center] = `${missing} (${missingPercent.toFixed(1)}%)`;
        });

        totalRow['Total'] = centers.reduce((sum, center) => sum + Number(totalRow[center] || 0), 0);
        const missingTotal = centers.reduce((sum, center) => {
          const variableCounts = cohortCenters[center]?.counts_unique_values?.[variableId] || {};
          return sum + Number(variableCounts['N/A'] || 0);
        }, 0);
        const denominatorTotal = Number(totalRow['Total']) + missingTotal;
        const missingTotalPercent = denominatorTotal > 0 ? (missingTotal / denominatorTotal) * 100 : 0;
        missingRow['Total'] = `${missingTotal} (${missingTotalPercent.toFixed(1)}%)`;

        rows.push(totalRow, missingRow);
        centersTable[cohort] = rows;
      });

      this.numericCenterCharts = [];
    } else if (this.isNumericVariableType(this.selectedValue.datatype)) {
      this.displayedColumnsCenters = ['Statistics'];

      cohorts.forEach((cohort, index) => {
        const cohortCenters = this.summaryStatisticsCenters[cohort] || {};
        const centers = this.getEffectiveCentersForCohort(cohortCenters, selectedCenterKeys);

        if (!centers.length) {
          return;
        }

        if (index === 0) {
          this.displayedColumnsCenters.push(...centers);
        }

        const rows: any[] = [
          { Statistics: 'N', field: 'count' },
          { Statistics: 'Q1', field: 'q_25' },
          { Statistics: 'Median', field: 'median' },
          { Statistics: 'Q3', field: 'q_75' },
          { Statistics: 'Missing', field: 'missing' }
        ];

        rows.forEach(row => {
          centers.forEach(center => {
            const variableData = cohortCenters[center]?.numeric?.[variableId] || {};
            const value = Number(variableData[row.field] ?? 0);
            row[center] = Number.isFinite(value) ? Number(value.toFixed(3)) : 0;
          });
        });

        centersTable[cohort] = rows;
      });

      this.buildNumericCenterCharts();
    }

    this.centersTables = centersTable;
  }

  buildNumericCenterCharts() {
    if (!this.selectedValue || !this.isNumericVariableType(this.selectedValue.datatype)) {
      this.numericCenterCharts = [];
      return;
    }

    const variableId = this.selectedValue.variable_id;
    const measureConfig = [
      { key: 'q_25', title: 'Q1 per center' },
      { key: 'median', title: 'Median per center' },
      { key: 'q_75', title: 'Q3 per center' },
      { key: 'missing', title: 'Missing per center' }
    ];

    const selectedCenterKeys = new Set(this.centerFilters.filter(center => center.selected).map(center => center.key));
    const selectedCohortKeys = new Set(this.cohortFilters.filter(cohort => cohort.selected).map(cohort => cohort.key));

    this.numericCenterCharts = Object.keys(this.summaryStatisticsCenters)
      .filter(cohort => !selectedCohortKeys.size || selectedCohortKeys.has(cohort))
      .map(cohort => {
        const cohortCenters = this.summaryStatisticsCenters[cohort] || {};
        const centers = this.getEffectiveCentersForCohort(cohortCenters, selectedCenterKeys);

        if (!centers.length) {
          return null;
        }

        const charts = measureConfig.map((measure, index) => {
          const values = centers.map(center => {
            const numeric = cohortCenters[center]?.numeric?.[variableId] || {};
            const raw = Number(numeric[measure.key] ?? 0);
            return Number.isFinite(raw) ? Number(raw.toFixed(3)) : 0;
          });

          return {
            title: measure.title,
            series: [{ name: measure.title, data: values }],
            chart: {
              type: 'bar',
              height: Math.max(180, centers.length * 44),
              toolbar: { show: false }
            },
            plotOptions: {
              bar: {
                horizontal: true,
                borderRadius: 4,
                barHeight: '60%'
              }
            },
            dataLabels: {
              enabled: true,
              formatter: (val: number) => Number(val).toFixed(2)
            },
            xaxis: {
              categories: centers
            },
            colors: [index % 2 === 0 ? '#1ab5e5' : '#275b83']
          };
        });

        return { cohort, charts };
      })
      .filter((item): item is { cohort: string; charts: Array<{ title: string; series: any[]; chart: any; xaxis: any; plotOptions: any; dataLabels: any; colors: string[] }> } => !!item);
  }

  getEffectiveCentersForCohort(cohortCenters: any, selectedCenterKeys: Set<string>): string[] {
    const allCenters = Object.keys(cohortCenters || {});
    if (!selectedCenterKeys.size) {
      return allCenters;
    }

    const filteredCenters = allCenters.filter(center => selectedCenterKeys.has(center));
    if (filteredCenters.length) {
      return filteredCenters;
    }

    // If permit labels and result keys differ (e.g., INT vs organization_id),
    // fall back to result centers to avoid empty center statistics/charts.
    return allCenters;
  }

  onCentersChange(): void {
    this.updateCentersTable();
  }

  onCohortsChange(): void {
    this.updateCohortsTable();
    this.updateCentersTable();
  }

  createVariable() {
    const dataframeId = Number(this.allCohorts?.[0]?.dataframe_vantage_id || 0);

    if (!dataframeId) {
      console.error('No dataframe_id available for variable creation');
      return;
    }

    const dialogRef = this.dialog.open(CreateVariableDialogComponent, {
      width: '600px',
      disableClose: true,
      data: {
        dataframe_id: dataframeId,
        variables: this.optionsVariables,
        centers: this.allCenters,
        cohorts: this.allCohorts
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        const method = result.method;
        const data = result.data;

        let requestObservable;
        switch (method) {
          case 'merge_variables':
            requestObservable = this.dataAnalysisService.createMergeVariables(data);
            break;
          case 'timedelta':
            requestObservable = this.dataAnalysisService.createTimeDeltaVariables(data);
            break;
          case 'one_hot_encoding':
            requestObservable = this.dataAnalysisService.createOneHotEncoding(data);
            break;
          case 'to_boolean':
            requestObservable = this.dataAnalysisService.createToBoolean(data);
            break;
          case 'computed_variables':
          default:
            requestObservable = this.dataAnalysisService.createBasicArithmeticRequest(data);
            break;
        }

        requestObservable.subscribe({
          next: () => {
            this.dataAnalysisService.getVariablesByDataframe(dataframeId).subscribe({
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

                this.resetSummaryFlow();

                this.tryInitializeSummaryFlow();
              },
              error: err => console.error('Error refreshing variables after creation', err)
            });
          },
          error: (err) => {
            console.error('Error creating variable:', err);
          }
        });
      }
    });
  }

  objectKeys(data: any) {
    return Object.keys(data || {});
  }

  tryInitializeSummaryFlow() {
    if (this.summaryFlowInitialized) {
      return;
    }

    if (!this.workspaceId || !this.analysisId) {
      return;
    }

    if (!this.allCohorts.length) {
      return;
    }

    this.summaryFlowInitialized = true;
    this.checkStatusDataFrame();
  }

  checkStatusDataFrame() {
    console.log("all cohorts: ", this.allCohorts);

    // Clear previous cohort status
    this.cohortStatusMap.clear();

    // Validate that all cohorts have task_id_vantage
    const cohortsWithoutTaskId = this.allCohorts.filter(
      cohort => !cohort?.task_id_vantage || cohort.task_id_vantage === 0 || cohort.task_id_vantage === null
    );

    if (cohortsWithoutTaskId.length > 0) {
      // Some cohorts are missing task_id_vantage - store error info for each affected cohort
      this.isLoading = false;
      this.isCrashed = true;
      this.taskStatus = 'dataframes_missing_taskid';

      cohortsWithoutTaskId.forEach(cohort => {
        const cohortName = cohort?.cohort_name || 'Unknown cohort';
        this.cohortStatusMap.set(cohortName, {
          status: 'error',
          message: 'Data loading error: Failed to create correctly. The dataframe initialization appears to have failed.',
          taskId: undefined
        });
      });

      const missingCohortNames = cohortsWithoutTaskId
        .map(cohort => cohort?.cohort_name || 'Unknown cohort')
        .join(', ');

      console.error(`Dataframes are not ready for cohorts: ${missingCohortNames}`);
      console.error('Missing or invalid task_id_vantage for:', cohortsWithoutTaskId);
      return;
    }

    // All cohorts have task_id_vantage, now check their status
    const dataframeTaskIds = this.allCohorts
      .map(cohort => ({ cohortName: cohort?.cohort_name || 'Unknown cohort', taskId: cohort.task_id_vantage }))
      .filter((item: any) => item.taskId !== null && item.taskId !== undefined && item.taskId !== 0);

    console.log("dataframeTaskIds (all present): ", dataframeTaskIds);

    if (!dataframeTaskIds.length) {
      // This shouldn't happen after validation, but handle it
      this.isLoading = false;
      this.isCrashed = true;
      this.taskStatus = 'dataframes_no_tasks';
      return;
    }

    // Check status of all dataframe tasks
    this.isLoading = true;
    this.taskStatus = 'checking_dataframe';
    this.checkAllDataFrameStatuses(dataframeTaskIds);
  }

  private checkAllDataFrameStatuses(taskItems: Array<{ cohortName: string; taskId: number }>) {
    const statusMap = new Map<number, { cohortName: string; status: string }>();

    // Check status of each dataframe task
    taskItems.forEach(item => {
      this.dataAnalysisService.getTaskStatus(item.taskId).subscribe({
        next: (res: { status: string }) => {
          statusMap.set(item.taskId, { cohortName: item.cohortName, status: res.status });
          console.log(`Dataframe task ${item.taskId} (${item.cohortName}) status:`, res.status);

          // Check if all tasks have been checked
          if (statusMap.size === taskItems.length) {
            this.evaluateDataFrameStatuses(statusMap, taskItems);
          }
        },
        error: (err) => {
          console.error(`Error checking dataframe status for task ${item.taskId}:`, err);
          statusMap.set(item.taskId, { cohortName: item.cohortName, status: 'error' });

          if (statusMap.size === taskItems.length) {
            this.evaluateDataFrameStatuses(statusMap, taskItems);
          }
        }
      });
    });
  }

  private evaluateDataFrameStatuses(statusMap: Map<number, { cohortName: string; status: string }>, taskItems: Array<{ cohortName: string; taskId: number }>) {
    const statuses = Array.from(statusMap.values()).map(item => item.status);
    const allCompleted = statuses.every(status => status === 'completed');
    const anyFailed = statuses.some(status => status === 'crashed' || status === 'error');
    const anyPending = statuses.some(status => status === 'pending');

    console.log('Dataframe statuses:', Array.from(statusMap.values()));

    if (allCompleted) {
      // All dataframes completed, proceed
      this.taskStatus = 'dataframes_completed';
      this.cohortStatusMap.clear();
      this.checkExistingSummaryOrCreate();
    } else if (anyFailed) {
      // At least one dataframe failed - store status for each affected cohort
      this.isLoading = false;
      this.isCrashed = true;
      this.taskStatus = 'dataframes_failed';

      statusMap.forEach((statusData, taskId) => {
        if (statusData.status === 'crashed' || statusData.status === 'error') {
          this.cohortStatusMap.set(statusData.cohortName, {
            status: statusData.status,
            message: `Vantage6 dataframe status: ${statusData.status}. The dataframe processing has failed.`,
            taskId: taskId
          });
        }
      });

      const failedCohorts = Array.from(this.cohortStatusMap.keys()).join(', ');
      console.error(`One or more dataframes failed for cohorts: ${failedCohorts}`);
    } else if (anyPending) {
      // At least one dataframe is still processing - store pending status
      this.taskStatus = 'dataframes_pending';
      console.log('Dataframes still processing, polling status...');

      statusMap.forEach((statusData, taskId) => {
        if (statusData.status === 'pending') {
          this.cohortStatusMap.set(statusData.cohortName, {
            status: statusData.status,
            message: `Vantage6 dataframe status: pending. Processing is underway.`,
            taskId: taskId
          });
        }
      });

      this.startPollingDataFrameStatus(taskItems);
    } else {
      // Unknown status, start polling
      this.taskStatus = 'dataframes_checking';
      console.log('Dataframes status unknown, polling...');
      this.startPollingDataFrameStatus(taskItems);
    }
  }

  private startPollingDataFrameStatus(taskItems: Array<{ cohortName: string; taskId: number }>) {
    clearInterval(this.pollingInterval);

    this.pollingInterval = setInterval(() => {
      const statusMap = new Map<number, { cohortName: string; status: string }>();

      taskItems.forEach(item => {
        this.dataAnalysisService.getTaskStatus(item.taskId).subscribe({
          next: (res: { status: string }) => {
            statusMap.set(item.taskId, { cohortName: item.cohortName, status: res.status });

            if (statusMap.size === taskItems.length) {
              this.evaluateDataFrameStatuses(statusMap, taskItems);
            }
          },
          error: (err) => {
            console.error(`Error polling dataframe status for task ${item.taskId}:`, err);
            statusMap.set(item.taskId, { cohortName: item.cohortName, status: 'error' });

            if (statusMap.size === taskItems.length) {
              this.evaluateDataFrameStatuses(statusMap, taskItems);
            }
          }
        });
      });
    }, this.pollingFrequency);
  }

  checkExistingSummaryOrCreate() {
    const cohortsIds = this.allCohorts
      .map(cohort => cohort?.id)
      .filter((cohortId: unknown) => cohortId !== null && cohortId !== undefined);

    if (!cohortsIds.length) {
      this.isLoading = false;
      return;
    }

    const body = { cohort_ids: cohortsIds };

    this.dataAnalysisService.existsSummaryByCohort(body).subscribe({
      next: (result: any) => {
        const summaries = Array.isArray(result)
          ? result
          : (Array.isArray(result?.summaries)
            ? result.summaries
            : (Array.isArray(result?.algorithms)
              ? result.algorithms
              : []));

        if (summaries.length === 0) {
          this.createSummaryRequest();
          return;
        }

        const latestSummary = [...summaries].sort((left: any, right: any) => {
          const leftId = Number(left?.id ?? 0);
          const rightId = Number(right?.id ?? 0);
          return rightId - leftId;
        })[0];

        const latestTaskId = Number(latestSummary?.task_id ?? 0);

        if (latestTaskId > 0) {
          this.startPollingTaskStatus(latestTaskId);
          return;
        }

        this.createSummaryRequest();
      },
      error: () => {
        this.createSummaryRequest();
      }
    });
  }

  createSummaryRequest() {
    const cohortsIds = this.allCohorts.map(cohort => cohort.id);
    const dataApplication = {
      workspace_id: this.workspaceId,
      analysis_id: this.analysisId,
      cohorts_ids: cohortsIds
    };

    this.dataAnalysisService.getSummaryStatisticsV6(dataApplication).subscribe({
      next: (result: { task_id: number; job_id: number }) => {
        if (result.task_id <= 0 || result.job_id <= 0) {
          console.error('Invalid task_id received from summary statistics request:', result);
          this.isLoading = false;
          this.isCrashed = true;
          return;
        }
        this.startPollingTaskStatus(result.task_id);
      },
      error: (err) => {
        console.error('Error creando summary statistics:', err);
        this.isLoading = false;
        this.isCrashed = true;
      }
    });
  }

  startPollingTaskStatus(taskId: number) {
    clearInterval(this.pollingInterval);

    this.currentTaskId = taskId;
    this.isLoading = true;
    this.taskStatus = 'pending';

    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
    }

    this.pollingInterval = setInterval(() => {
      this.dataAnalysisService.getTaskStatus(taskId).subscribe({
        next: (res: { status: string }) => {
          if (this.taskStatus !== res.status) {
            const bodyUpdateAlgorithm = {
              task_id: taskId,
              status_task: res.status
            };

            this.dataAnalysisService.updateAlgorithmsStatus(bodyUpdateAlgorithm).subscribe({
              next: () => { },
              error: err => console.error('Error updateTaskResult', err)
            });
          }

          this.taskStatus = res.status;
          console.log("Estado del task:", this.taskStatus);

          if (this.taskStatus === 'completed') {
            clearInterval(this.pollingInterval);
            this.fetchTaskResult(taskId);
            this.isLoading = false;
            this.isCrashed = false;

            this.dataAnalysisService.getSubTask(taskId).subscribe({
              next: (subtaskNumber: any) => {
                const subtaskId = Number(subtaskNumber);

                const bodyUpdateAlgorithm = {
                  task_id: taskId,
                  subtask_id: subtaskId,
                  status_subtask: 'completed'
                };

                this.dataAnalysisService.updateAlgorithmsStatus(bodyUpdateAlgorithm).subscribe({
                  next: updateTaskResult => {
                    console.log("updateTaskResult subtask: ", updateTaskResult);

                  },
                  error: err => console.error('Error updateTaskResult', err)
                });

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
          } else if (this.taskStatus === 'crashed') {
            clearInterval(this.pollingInterval);
            this.isLoading = false;
            this.isCrashed = true;
            console.error("La tarea falló");
          }
        },
        error: (err) => {
          console.error('Error consultando el status:', err);
        }
      });
    }, this.pollingFrequency);
  }

  processResultLocal() {
    console.log("ProcessResultLocal", this.resultLocal);
    console.log("ProcessResultLocal - selectedValue", this.selectedValue);
    console.log("ProcessResultLocal - resultGlobal", this.resultGlobal);


    if (!this.resultGlobal || !this.resultLocal) return;

    const localEntries = this.normalizeLocalEntries(this.resultLocal);
    const centersSummary: any = {};

    localEntries.forEach((entry: any) => {
      const cohortName = entry?.cohortName;
      const cohortData = entry?.cohortData;

      if (!cohortName || !cohortData || typeof cohortData !== 'object') {
        return;
      }

      const centerName = this.resolveCenterLabel(cohortData.organization_id);

      if (!centersSummary[cohortName]) {
        centersSummary[cohortName] = {};
      }

      centersSummary[cohortName][centerName] = cohortData;
    });

    this.syncCenterFilters(this.authorizedCenterLabels);
    this.summaryStatisticsCenters = centersSummary;
    this.updateCentersTable();
  }

  normalizeLocalEntries(raw: any): Array<{ cohortName: string; cohortData: any }> {
    if (!raw) return [];

    const unwrapped = raw?.result ?? raw?.data ?? raw;
    const records: Array<{ cohortName: string; cohortData: any }> = [];

    const pushCohortEntries = (container: any) => {
      if (!container || typeof container !== 'object') {
        return;
      }

      Object.keys(container).forEach((cohortName: string) => {
        const cohortValue = container[cohortName];

        if (Array.isArray(cohortValue)) {
          cohortValue.forEach((nodeResult: any) => {
            if (nodeResult && typeof nodeResult === 'object') {
              records.push({ cohortName, cohortData: nodeResult });
            }
          });
          return;
        }

        if (cohortValue && typeof cohortValue === 'object') {
          records.push({ cohortName, cohortData: cohortValue });
        }
      });
    };

    if (Array.isArray(unwrapped)) {
      unwrapped.forEach(entry => pushCohortEntries(entry));
      return records;
    }

    pushCohortEntries(unwrapped);
    if (records.length) {
      return records;
    }

    if (unwrapped && typeof unwrapped === 'object') {
      records.push({ cohortName: 'Unknown cohort', cohortData: unwrapped });
    }

    return records;
  }

  syncCenterFilters(centerLabels: string[]): void {
    const normalized = Array.from(new Set((centerLabels || []).filter(Boolean).map(label => String(label).trim())));
    const previousByKey = new Map(this.centerFilters.map(center => [center.key, center.selected]));

    this.centerFilters = normalized.map(label => ({
      key: label,
      label,
      selected: previousByKey.has(label) ? Boolean(previousByKey.get(label)) : true
    }));
  }

  syncCohortFilters(): void {
    const cohortNames = this.allCohorts
      .map((cohort: any) => String(cohort?.cohort_name || '').trim())
      .filter((cohortName: string) => !!cohortName);

    const previousByKey = new Map(this.cohortFilters.map(cohort => [cohort.key, cohort.selected]));

    this.cohortFilters = cohortNames.map(cohortName => ({
      key: cohortName,
      label: cohortName,
      selected: previousByKey.has(cohortName) ? Boolean(previousByKey.get(cohortName)) : true
    }));
  }

  extractCenterLabelsFromPermitPayload(permitPayload: any): string[] {
    const permitList = Array.isArray(permitPayload)
      ? permitPayload
      : (Array.isArray(permitPayload?.permit) ? permitPayload.permit : [permitPayload]);

    const labels = new Set<string>();

    permitList.forEach((entry: any) => {
      if (!entry) {
        return;
      }

      const rawCoesGranted = entry?.coes_granted ?? entry?.coEs_granted ?? entry;

      if (Array.isArray(rawCoesGranted)) {
        rawCoesGranted.forEach((coe: any) => {
          if (typeof coe === 'string') {
            labels.add(coe.trim());
            return;
          }

          if (coe !== undefined && coe !== null) {
            labels.add(String(coe).trim());
          }
        });
        return;
      }

      if (typeof rawCoesGranted === 'string') {
        const cleaned = rawCoesGranted.replace(/[{}]/g, '');
        cleaned.split(',').map((value: string) => value.trim()).filter(Boolean).forEach((value: string) => labels.add(value));
        return;
      }

      if (rawCoesGranted && typeof rawCoesGranted === 'object') {
        Object.keys(rawCoesGranted).forEach((key: string) => {
          if (key) {
            labels.add(key.trim());
          }
        });
      }
    });

    return Array.from(labels);
  }

  resolveCenterLabel(organizationId: any): string {
    return String(organizationId ?? 'Unknown center').trim();
  }

  fetchTaskResult(taskId: number) {
    this.dataAnalysisService.getTaskResult(taskId).subscribe({
      next: (result) => {
        const summary: any[] = [];

        this.resultGlobal = result.result;
        console.log("Result global : ", this.resultGlobal);


        Object.keys(result.result).forEach(cohortName => {
          const nodeData = result.result[cohortName];
          const numericMapped: any = {};
          const countsMapped: any = {};
          const categoricalCount: any = {};

          this.optionsVariables.forEach(v => {
            const key = v.variable_id;

            if (nodeData.numeric && nodeData.numeric[key] !== undefined) {
              numericMapped[key] = nodeData.numeric[key];
            }

            if (nodeData.counts_unique_values && nodeData.counts_unique_values[key] !== undefined) {
              countsMapped[key] = nodeData.counts_unique_values[key];
            }

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
        });

        this.summaryStatisticsCohorts = summary;
        console.log("result of summaryS: ", this.summaryStatisticsCohorts);
        this.updateCohortsTable();
        this.updateCentersTable();
      },
      error: (err) => {
        console.error('Error obteniendo el resultado de la tarea:', err);
      }
    });
  }

  private resetSummaryFlow(): void {
    clearInterval(this.pollingInterval);

    this.summaryFlowInitialized = false;
    this.isLoading = true;
    this.isCrashed = false;
    this.taskStatus = '';

    this.resultGlobal = [];
    this.resultLocal = [];

    this.summaryStatisticsCohorts = [];
    this.summaryStatisticsCenters = {};
    this.centersTables = {};
    this.numericCenterCharts = [];

    this.dataSourceCohorts.data = [];
    this.displayedColumnsCohorts = [];

    this.dataSourceCenters.data = [];
    this.displayedColumnsCenters = [];

    this.cohortStatusMap.clear();
  }
}
