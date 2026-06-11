import { Component, EventEmitter, OnDestroy, OnInit, Output } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { DataAnalysisService } from '../../data-analysis.service';
import { Router } from '@angular/router';
import { SelectionService } from '../selection.service';
import { MatTableDataSource } from '@angular/material/table';
import { HttpClient } from '@angular/common/http';
import { MatDialog } from '@angular/material/dialog';
import { CreateVariableDialogComponent } from '../create-variable-dialog/create-variable-dialog.component';
import { interval, forkJoin, of } from 'rxjs';
import { switchMap, takeWhile, catchError, takeUntil } from 'rxjs/operators';
import { FormControl } from '@angular/forms';

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
  variableFilterCtrl = new FormControl('', { nonNullable: true });
  filteredVariables: any[] = [];


  taskStatus = '';
  taskLogs: string = '';

  isLoading = true;
  isCrashed = false;
  resultGlobal: any = [];
  resultLocal: any = [];
  pollingInterval: any;
  pollingFrequency = 3000;
  summaryFlowInitialized = false;

  // Track status details for each cohort
  cohortStatusList: {
    key: string;
    status: string;
    message: string;
    taskId?: number;
  }[] = [];

  sortDirection: 'asc' | 'desc' = 'asc';

  currentTaskId: number | null = null;

  private destroy$ = new Subject<void>();


  selectedCenters: any[] = [];
  selectedCohorts: any[] = [];
  nodeData: any;
  showCenters = true;
  showCohorts = true;
  variableList: any[] = [];
  summaryStatisticsCohorts: any[] = [];
  summaryStatisticsCenters: any = {};
  groupedVariables: any[] = [];

  summaryTableNum: any[] = [
    { Statistics: 'N', field: 'count' },
    { Statistics: 'Mean', field: 'mean' },
    { Statistics: 'Min', field: 'min' },
    { Statistics: 'Max', field: 'max' },
    { Statistics: 'Missing', field: 'missing' }
  ];

  centersTables: any = {};
  numericCenterCharts: Array<{ cohort: string; charts: Array<{ title: string; series: any[]; chart: any; xaxis: any; plotOptions: any; dataLabels: any; colors: string[] }> }> = [];
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
          // console.log("Variables from server ", variables);
          // console.log("Variables from server list", variables.variablesList);
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
              datatype: this.mapDatatype(v.dtype),
              display_name: this.formatVariableName(v.name)
            }));

          this.groupVariables(this.optionsVariables);
          this.filteredVariables = [...this.optionsVariables];
          this.filterVariables(this.variableFilterCtrl.value);
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

    this.variableFilterCtrl.valueChanges.subscribe(search => {
      this.filterVariables(search);
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
    this.cohortStatusList = [];
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

          const displayValue = this.selectedValue.variable_name === 'topography'
            ? this.mapTopographyValue(val)
            : val;

          if (variableCohorts.length <= i) {
            variableCohorts.push({
              [variableName]: displayValue,
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
    else if (this.selectedValue.datatype === 'Date') {
      variableCohorts = this.summaryTableNum.map(row => ({ ...row }));
      this.displayedColumnsCohorts.push('Statistics');

      this.summaryStatisticsCohorts.forEach((statistic: any, index: number) => {
        const variableData = statistic.rps_cohort?.date?.[variableId] || {};
        const cohortLabel = `Cohort ${index + 1}`;
        this.displayedColumnsCohorts.push(cohortLabel);

        variableCohorts = variableCohorts.map((row: any) => {
          const rawValue = variableData[row.field];
          return {
            ...row,
            [cohortLabel]: this.formatValue(rawValue, this.selectedValue.datatype, row.field)
          };
        });
      });
    }



    this.dataSourceCohorts.data = variableCohorts;
    this.dataSourceCohorts._updateChangeSubscription();
  }

  private formatValue(value: any, datatype: string, field?: string): any {
    if (value == null) return '-';

    // 👇 CASO DATE
    if (datatype === 'Date') {

      // estos NO son fechas
      if (field === 'count' || field === 'missing') {
        return value;
      }

      const date = new Date(value);

      return isNaN(date.getTime())
        ? value
        : date.toLocaleDateString(); // o formato custom
    }

    // 👇 NUMERIC
    if (datatype === 'Number') {
      const num = Number(value);
      return Number.isFinite(num) ? Number(num.toFixed(3)) : 0;
    }

    return value;
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
    const analysis_id = this.allCohorts[0].analysis_id;

    if (!dataframeId) {
      console.error('No dataframe_id available for variable creation');
      return;
    }

    const dialogRef = this.dialog.open(CreateVariableDialogComponent, {
      width: '600px',
      disableClose: true,
      data: {
        dataframe_id: dataframeId,
        analysis_id: analysis_id,
        variables: this.optionsVariables,
        centers: this.allCenters,
        cohorts: this.allCohorts,
        summaryStatistics: this.summaryStatisticsCohorts
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
          case 'merge_categories':
            requestObservable = this.dataAnalysisService.createMergeCategories(data);
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

                this.filteredVariables = [...this.optionsVariables];
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
    // console.log("all cohorts: ", this.allCohorts);

    this.cohortStatusList = [];

    const cohortsWithoutTaskId = this.allCohorts.filter(
      cohort => !cohort?.task_id_vantage
    );

    if (cohortsWithoutTaskId.length > 0) {
      this.isLoading = false;
      this.isCrashed = true;
      this.taskStatus = 'dataframes_missing_taskid';

      cohortsWithoutTaskId.forEach(cohort => {
        this.cohortStatusList.push({
          key: cohort?.cohort_name || 'Unknown cohort',
          status: 'error',
          message: 'Dataframe initialization failed',
          taskId: undefined
        });
      });

      return;
    }

    const cohortIds = this.allCohorts
      .map(cohort => cohort?.id)
      .filter((id): id is number => !!id);

    this.checkDataframesUntilReady(cohortIds);
  }


  checkDataframesUntilReady(cohortIds: number[]): void {

    if (!cohortIds.length) {
      this.isLoading = false;
      return;
    }

    this.isLoading = true;
    this.isCrashed = false;

    interval(this.pollingFrequency)
      .pipe(
        switchMap(() => {

          const requests = cohortIds.map(id =>
            this.dataAnalysisService.isDataframeReady(id).pipe(
              catchError(() => of({ status: 'error' }))
            )
          );

          return forkJoin(requests);
        }),

        takeWhile((results: { status: string }[]) => {
          const allCompleted = results.every(r => r.status === 'completed');

          const anyFailed = results.some(r =>
            r.status === 'error' || r.status === 'timeout'
          );

          if (allCompleted) {
            this.taskStatus = 'dataframes_completed';
            this.isLoading = false;
            this.isCrashed = false;

            this.checkExistingSummaryOrCreate();
            return false;
          }

          if (anyFailed) {
            this.taskStatus = 'dataframes_failed';
            this.isLoading = false;
            this.isCrashed = true;

            return false;
          }

          this.taskStatus = 'dataframes_pending';
          return true;

        }, true)
      )
      .subscribe();
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


  checkAllDataframesReady(): void {
    const cohortIds = this.allCohorts
      .map(cohort => cohort?.id)
      .filter((id): id is number => id !== null && id !== undefined);

    if (!cohortIds.length) {
      this.isLoading = false;
      return;
    }

    this.isLoading = true;

    const requests = cohortIds.map(cohortId =>
      this.dataAnalysisService.isDataframeReady(cohortId)
    );

    forkJoin(requests).subscribe({
      next: (results: { ready: string }[]) => {

        const allCompleted = results.every(res => res.ready === 'completed');

        this.isLoading = false;

        if (allCompleted) {
          this.isCrashed = false;
          this.taskStatus = 'dataframe_ready';
        } else {
          this.isCrashed = true;
          this.taskStatus = 'dataframe_not_ready';
        }
      },

      error: (err) => {
        console.error('Error checking dataframes:', err);
        this.isLoading = false;
        this.isCrashed = true;
        this.taskStatus = 'dataframe_check_failed';
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
    this.currentTaskId = taskId;
    this.isLoading = true;
    this.isCrashed = false;
    this.taskStatus = 'pending';

    interval(this.pollingFrequency)
      .pipe(
        takeUntil(this.destroy$),

        switchMap(() =>
          this.dataAnalysisService.getTaskStatus(taskId)
        ),

        takeWhile((res: { status: string; logs?: string }) => {
          this.taskStatus = res.status;
          if (res.status === 'completed') {
            this.handleCompletedTask(taskId);
            return false;
          }

          if (res.status === 'crashed') {
            this.handleCrashedTask(taskId, res.logs || '');
            return false;
          }

          return true;
        }, true)
      )
      .subscribe({
        error: err => {
          console.error('Polling error:', err);
          this.isLoading = false;
          this.isCrashed = true;
        }
      });
  }

  private handleCompletedTask(taskId: number) {
    this.isLoading = false;
    this.isCrashed = false;

    this.fetchTaskResult(taskId);

    this.dataAnalysisService.getSubTask(taskId).subscribe({
      next: (subtaskNumber: any) => {
        const subtaskId = Number(subtaskNumber);

        this.syncSubtask(taskId, subtaskId);
        this.loadSubtaskResults(subtaskId);
      },
      error: err => console.error('Error fetching subtask', err)
    });
  }

  private buildCohortStatusFromLogs(taskId: number, logs: string) {
    this.cohortStatusList = [];

    if (!logs) {
      this.cohortStatusList.push({
        key: 'general',
        status: 'crashed',
        message: 'No logs disponibles',
        taskId
      });
      return;
    }

    const lines = logs.split('\n');

    let errorCount = 0;

    for (const line of lines) {
      const clean = line.trim();
      if (!clean) continue;

      if (this.isErrorLine(clean)) {
        errorCount++;

        this.cohortStatusList.push({
          key: `error-${errorCount}`,
          status: 'crashed',
          message: clean,
          taskId
        });
      }
    }

    // fallback útil
    if (this.cohortStatusList.length === 0) {
      this.cohortStatusList.push({
        key: 'general',
        status: 'crashed',
        message: logs.slice(0, 400),
        taskId
      });
    }
  }


  private isErrorLine(line: string): boolean {
    const lower = line.toLowerCase();

    return (
      lower.includes('error') ||
      lower.includes('exception') ||
      lower.includes('failed') ||
      lower.includes('crash')
    );
  }

  private handleCrashedTask(taskId: number, logs: string) {
    this.isLoading = false;
    this.isCrashed = true;

    const cleanLogs = this.cleanAnsiLogs(logs);

    this.buildCohortStatusFromLogs(taskId, cleanLogs);

    console.error('Task crashed');
    console.error(cleanLogs);
  }

  private cleanAnsiLogs(logs: string): string {
    return logs.replace(/\x1B\[[0-9;]*m/g, '');
  }

  private syncSubtask(taskId: number, subtaskId: number) {
    const body = {
      task_id: taskId,
      subtask_id: subtaskId,
      status_subtask: 'completed'
    };

    this.dataAnalysisService.updateAlgorithmsStatus(body).subscribe({
      next: res => console.log('Subtask updated', res),
      error: err => console.error('Error updating subtask', err)
    });
  }

  private loadSubtaskResults(subtaskId: number) {
    this.dataAnalysisService.getSubTaskResults(subtaskId).subscribe({
      next: res => {
        this.resultLocal = res;
        this.processResultLocal();
      },
      error: err => console.error('Error subtask results', err)
    });
  }

  processResultLocal() {
    // console.log("ProcessResultLocal", this.resultLocal);
    // console.log("ProcessResultLocal - selectedValue", this.selectedValue);
    // console.log("ProcessResultLocal - resultGlobal", this.resultGlobal);


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
        // console.log("Result global : ", this.resultGlobal);


        Object.keys(result.result).forEach(cohortName => {
          const nodeData = result.result[cohortName];
          const numericMapped: any = {};
          const countsMapped: any = {};
          const categoricalCount: any = {};
          const dateCount: any = {};

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

            if (nodeData.date && nodeData.date[key] !== undefined) {
              dateCount[key] = nodeData.date[key];
            }
          });

          summary.push({
            cohort_name: cohortName,
            rps_cohort: {
              numeric: numericMapped,
              counts_unique_values: countsMapped,
              categorical_count: categoricalCount,
              date: dateCount
            }
          });
        });

        this.summaryStatisticsCohorts = summary;
        this.updateCohortsTable();
        this.updateCentersTable();
      },
      error: (err) => {
        console.error('Error obteniendo el resultado de la tarea:', err);
      }
    });
  }

  private resetSummaryFlow(): void {
    this.cohortStatusList = [];
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
    this.cohortStatusList = [];
  }

  filterVariables(search: string) {
    if (!search) {
      this.filteredVariables = this.optionsVariables;
      return;
    }

    const filterValue = search.toLowerCase();

    this.filteredVariables = this.optionsVariables.filter(option =>
      option.variable_name.toLowerCase().includes(filterValue)
    );

    this.groupVariables(this.filteredVariables);
  }

  private formatVariableName(name: string): string {
    if (!name) return '';

    // 1. reemplazar _
    let formatted = name.replace(/_/g, ' ');

    // 2. minúsculas + capitalizar palabras
    formatted = formatted.toLowerCase().replace(/\b\w/g, char => char.toUpperCase());

    return formatted;
  }

  private groupVariables(variables: any[]) {
    const groups: { [key: string]: any[] } = {};

    variables.forEach(v => {
      const category = v.datatype;

      if (!groups[category]) {
        groups[category] = [];
      }

      groups[category].push(v);
    });

    // ordenar dentro de cada grupo
    Object.keys(groups).forEach(cat => {
      groups[cat] = this.sortVariables(groups[cat]);
    });

    // ordenar categorías (opcional)
    const order = ['Categorical', 'Boolean', 'Number', 'Date', 'String', 'Other'];

    this.groupedVariables = Object.keys(groups)
      .sort((a, b) => order.indexOf(a) - order.indexOf(b))
      .map(cat => ({
        category: cat,
        options: groups[cat]
      }));
  }

  // sortVariables(list: any[]): any[] {
  //   return list.sort((a, b) =>
  //     a.display_name.localeCompare(b.display_name, undefined, { sensitivity: 'base' })
  //   );
  // }

  private sortVariables(list: any[]) {
    return list.sort((a, b) => {
      const result = a.display_name.localeCompare(b.display_name, undefined, { sensitivity: 'base' });
      return this.sortDirection === 'asc' ? result : -result;
    });
  }

  getCategoryLabel(type: string): string {
    const map: any = {
      Number: 'Numeric',
      String: 'Text',
      Categorical: 'Categorical',
      Date: 'Date',
      Boolean: 'Boolean',
      Other: 'Other'
    };

    return map[type] || type;
  }


  toggleSort() {
    this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    this.groupVariables(this.optionsVariables);
  }

  private mapTopographyValue(value: string): string {
    return this.topographyMap[value] || value;
  }


  private topographyMap: Record<string, string> = {
    'C10.0': 'Vallecula',
    'C10.1': 'Anterior surface of epiglottis',
    'C10.2': 'Lateral wall of oropharynx / Lateral wall of mesopharynx',
    'C10.3': 'Posterior wall of oropharynx / Posterior wall of mesopharynx',
    'C10.4': 'Branchial cleft (site of neoplasm)',
    'C10.8': 'Overlapping lesion of oropharynx / Junctional region of oropharynx',
    'C10.9': 'Oropharynx, NOS / Mesopharynx, NOS',

    'C11.0': 'Superior wall of nasopharynx / Roof of nasopharynx',
    'C11.1': 'Posterior wall of nasopharynx / Adenoid',
    'C11.2': 'Lateral wall of nasopharynx / Fossa of Rosenmuller',
    'C11.3': 'Anterior wall of nasopharynx / Nasopharyngeal surface of soft palate',
    'C11.8': 'Overlapping lesion of nasopharynx',
    'C11.9': 'Nasopharynx, NOS / Nasopharyngeal wall',

    'C12.9': 'Pyriform sinus / Piriform sinus',

    'C13.0': 'Postcricoid region / Cricopharynx',
    'C13.1': 'Hypopharyngeal aspect of aryepiglottic fold / Aryepiglottic fold, NOS',
    'C13.2': 'Posterior wall of hypopharynx',
    'C13.8': 'Overlapping lesion of hypopharynx',
    'C13.9': 'Hypopharynx, NOS / Hypopharyngeal wall',

    'C14.0': 'Pharynx, NOS / Pharyngeal wall, NOS',

    'C30.0': 'Nasal cavity',

    'C31.0': 'Maxillary sinus',
    'C31.1': 'Ethmoid sinus',
    'C31.2': 'Frontal sinus',
    'C31.3': 'Sphenoid sinus',
    'C31.8': 'Overlapping lesion of accessory sinuses',
    'C31.9': 'Accessory sinus, NOS',

    'C32.0': 'Glottis / Intrinsic larynx',
    'C32.1': 'Supraglottis / Epiglottis, NOS',
    'C32.2': 'Subglottis',
    'C32.3': 'Laryngeal cartilage / Arytenoid cartilage',
    'C32.8': 'Overlapping lesion of larynx',
    'C32.9': 'Larynx, NOS',

    'C33.9': 'Trachea',

    'C34.0': 'Bronchus',

    'C37.9': 'Thymus',

    'C38.4': 'Pleura',

    'C48.0': 'Retroperitoneum',

    'C48.1': 'Mesentery / Peritoneum',

    'C49.0': 'Head / Neck',
    'C49.1': 'Hand / Wrist',
    'C49.2': 'Foot / Ankle',
    'C49.3': 'Periscapular / Trapezius muscle',
    'C49.4': 'Abdominal wall muscle / Umbilicus',
    'C49.5': 'Groin / Buttock',
    'C49.6': 'Back / Flank',

    'C77.0': 'Lymph nodes of head, face and neck'
  };
}
