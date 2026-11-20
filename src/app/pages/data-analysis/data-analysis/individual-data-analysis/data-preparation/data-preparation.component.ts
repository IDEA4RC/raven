import { Component, EventEmitter, OnDestroy, OnInit, Output } from '@angular/core';
import { Observable, Subject, interval, forkJoin, of } from 'rxjs';
import { DataAnalysisService } from '../../data-analysis.service';
import { Router } from '@angular/router';
import { SelectionService } from '../selection.service';
import { MatTableDataSource } from '@angular/material/table';
import { HttpClient } from '@angular/common/http';
import { MatDialog } from '@angular/material/dialog';
import { CreateVariableDialogComponent } from '../create-variable-dialog/create-variable-dialog.component';
import { switchMap, takeWhile, catchError, takeUntil } from 'rxjs/operators';
import { FormControl } from '@angular/forms';
import { TopographyService } from 'src/app/services/topography.service';

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
  optionsVariables: { variable_name: string; variable_id: string; datatype: string, display_name: string }[] = [];
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

  private readonly cohortChange$ = new Subject<void>();
  private activeCohortSignature = '';

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

  summaryTableDate: any[] = [
    { Statistics: 'N', field: 'count' },
    { Statistics: 'Min', field: 'min' },
    { Statistics: 'Max', field: 'max' },
    { Statistics: 'Missing', field: 'missing' }
  ];

  centersTables: any = {};
  centerCharts: Array<{
    cohort: string;
    distributionChart: any | null;
    missingChart: any;
  }> = [];
  selectedValue: any = null;
  displayedColumnsCentersByCohort: Record<string, string[]> = {};

  dataSourceCohorts = new MatTableDataSource<any>();
  displayedColumnsCohorts: string[] = [];

  dataSourceCenters = new MatTableDataSource<any>();
  displayedColumnsCenters: string[] = [];
  cohortColumnLabelMap: Record<string, string> = {};
  observable_coes_granted$: Observable<any> | undefined;
  observable_data_preparation_cohort$: Observable<any> | undefined;
  observable_data_preparation_center$: Observable<any> | undefined;
  private permitSubscription: any;
  private dataPreparationSubscriptionCohort: any;
  private dataPreparationSubscriptionCenter: any;
  topographyMap: Record<string, string> = {};

  constructor(
    private dataAnalysisService: DataAnalysisService,
    private router: Router,
    private selectionService: SelectionService,
    private http: HttpClient,
    private dialog: MatDialog,
    private topographyService: TopographyService
  ) {
  }

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

    this.selectionService.selectedItems$
      .pipe(takeUntil(this.destroy$))
      .subscribe(items => {
        const newCohorts = Array.isArray(items) ? items : [];
        const newSignature = this.getCohortSignature(newCohorts);
        const cohortsChanged =
          this.activeCohortSignature !== '' &&
          this.activeCohortSignature !== newSignature;

        if (cohortsChanged) {
          this.resetCohortDependentState();
        }

        this.activeCohortSignature = newSignature;
        this.allCohorts = newCohorts;
        this.syncCohortFilters();

        if (!this.allCohorts.length) {
          this.isLoading = false;
          return;
        }

        this.loadVariablesForSelectedCohorts();
        this.tryInitializeSummaryFlow();
      });

    this.observable_data_preparation_cohort$ = this.dataAnalysisService.data_preparation_cohort;
    this.observable_data_preparation_center$ = this.dataAnalysisService.data_preparation_center;

    // console.log("observable_data_preparation_center : ", this.observable_data_preparation_center$);
    // console.log("observable_data_preparation_cohort : ", this.observable_data_preparation_cohort$);

    this.dataPreparationSubscriptionCohort = this.observable_data_preparation_cohort$.subscribe((data: any) => {
      // console.log("observable_data_preparation_cohort data:", data);

      this.summaryStatisticsCohorts = data;
      this.updateCohortsTable();
    });

    this.dataPreparationSubscriptionCenter = this.observable_data_preparation_center$.subscribe((data: any) => {
      // console.log("dataPreparationSubscriptionCenter data:", data);

      this.summaryStatisticsCenters = data;
      this.updateCentersTable();
    });

    this.variableFilterCtrl.valueChanges.subscribe(search => {
      this.filterVariables(search);
    });

    this.topographyService.getTopographyMap().subscribe(map => {
      this.topographyMap = map;
    });
  }

  private getCohortSignature(cohorts: any[]): string {
    return cohorts
      .map(cohort => String(cohort?.id ?? ''))
      .filter(Boolean)
      .sort()
      .join('|');
  }

  private resetCohortDependentState(): void {
    /*
     * Cancel requests and polling operations associated with the previous
     * cohort selection.
     */
    this.cohortChange$.next();

    this.summaryFlowInitialized = false;
    this.currentTaskId = null;
    this.taskStatus = '';
    this.taskLogs = '';

    this.isLoading = true;
    this.isCrashed = false;

    this.selectedValue = null;
    this.resultGlobal = [];
    this.resultLocal = [];

    this.summaryStatisticsCohorts = [];
    this.summaryStatisticsCenters = {};

    this.centersTables = {};
    this.centerCharts  = [];
    this.displayedColumnsCentersByCohort = {};

    this.dataSourceCohorts.data = [];
    this.displayedColumnsCohorts = [];
    this.cohortColumnLabelMap = {};

    this.dataSourceCenters.data = [];
    this.displayedColumnsCenters = [];

    this.cohortStatusList = [];
    this.optionsVariables = [];
    this.filteredVariables = [];
    this.groupedVariables = [];

    this.variableFilterCtrl.setValue('', { emitEvent: false });

    /*
     * showCenters and showCohorts are intentionally not reset, so the user's
     * display preferences remain unchanged.
     */
  }

  private loadVariablesForSelectedCohorts(): void {
    const dataframeId = this.allCohorts
      .map(cohort => cohort?.dataframe_vantage_id)
      .find(id => id !== undefined && id !== null);

    if (!dataframeId) {
      this.optionsVariables = [];
      this.filteredVariables = [];
      this.groupedVariables = [];
      return;
    }

    this.dataAnalysisService.getVariablesByDataframe(dataframeId)
      .pipe(
        takeUntil(this.cohortChange$),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (variables: any) => {
          const seen = new Set<string>();

          this.optionsVariables = (variables?.variablesList || [])
            .filter((variable: any) => {
              if (!variable?.name || seen.has(variable.name)) {
                return false;
              }

              seen.add(variable.name);
              return true;
            })
            .map((variable: any) => ({
              variable_name: variable.name,
              variable_id: variable.name,
              datatype: this.mapDatatype(variable.dtype),
              display_name: this.formatVariableName(variable.name)
            }));

          this.filteredVariables = [...this.optionsVariables];
          this.groupVariables(this.filteredVariables);
          this.filterVariables(this.variableFilterCtrl.value);
        },
        error: error => {
          console.error('Error loading variables for selected cohorts:', error);
          this.optionsVariables = [];
          this.filteredVariables = [];
          this.groupedVariables = [];
        }
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
    this.centerCharts = [];
    this.dataSourceCohorts.data = [];
    this.displayedColumnsCohorts = [];
    this.dataSourceCenters.data = [];
    this.displayedColumnsCenters = [];
    this.optionsVariables = [];
    this.displayedColumnsCentersByCohort = {};
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
    this.cohortColumnLabelMap = {};
    if (!this.selectedValue) return;

    let variableCohorts: any[] = [];
    const variableName = this.selectedValue.variable_name;
    const variableId = this.selectedValue.variable_id;

    this.displayedColumnsCohorts = [];
    this.dataSourceCohorts.data = [];

    if (this.selectedValue.datatype === 'Categorical' || this.selectedValue.datatype === 'Boolean') {
      const rowsByValue: Record<string, any> = {};
      const totalRow: any = { [variableName]: 'Total' };
      const missingRow: any = { [variableName]: 'Missing' };
      this.displayedColumnsCohorts.push(variableName);

      this.summaryStatisticsCohorts.forEach((statistic: any, index: number) => {
        const variableData = statistic.rps_cohort?.counts_unique_values?.[variableId] || {};
        const variableCounts = statistic.rps_cohort?.categorical_count?.[variableId] || {};

        const cohortLabel = `Cohort ${index + 1}`;
        this.cohortColumnLabelMap[cohortLabel] = this.getOriginalCohortName(
          statistic.cohort_name,
          cohortLabel
        );

        this.displayedColumnsCohorts.push(cohortLabel);

        let missing = Number(variableCounts['missing'] || 0);
        missing += Number(variableData['N/A'] || 0);

        Object.keys(variableData)
          .filter(val => val !== 'N/A')
          .forEach((val: string) => {
            const displayValue = this.selectedValue.variable_name === 'topography'
              ? this.mapTopographyValue(val)
              : val;

            if (!rowsByValue[val]) {
              rowsByValue[val] = {
                [variableName]: displayValue
              };
            }

            rowsByValue[val][cohortLabel] = variableData[val];
          });

        const validCount = this.toFiniteNumber(
          variableCounts.count,
          0
        );

        const total = validCount + missing;
        const missingPerc = total > 0 ? (missing / total) * 100 : 0;

        totalRow[cohortLabel] = total;
        missingRow[cohortLabel] = `${missing} (${missingPerc.toFixed(1)}%)`;
      });

      variableCohorts = Object.keys(rowsByValue)
        .sort((a, b) => {
          const labelA = this.selectedValue.variable_name === 'topography'
            ? this.mapTopographyValue(a)
            : a;

          const labelB = this.selectedValue.variable_name === 'topography'
            ? this.mapTopographyValue(b)
            : b;

          return labelA.localeCompare(labelB, undefined, { sensitivity: 'base' });
        })
        .map(val => rowsByValue[val]);

      variableCohorts.push(missingRow);
      variableCohorts.push(totalRow);


    } else if (this.isNumericVariableType(this.selectedValue.datatype)) {
      variableCohorts = this.summaryTableNum.map(row => ({ ...row }));
      this.displayedColumnsCohorts.push('Statistics');

      this.summaryStatisticsCohorts.forEach((statistic: any, index: number) => {
        const variableData = statistic.rps_cohort?.numeric?.[variableId] || {};
        const cohortLabel = `Cohort ${index + 1}`;
        this.displayedColumnsCohorts.push(cohortLabel);

        variableCohorts = variableCohorts.map(
          (row: any) => {
            const validCount =
              this.toFiniteNumber(
                variableData.count,
                0
              );

            const missingCount =
              this.toFiniteNumber(
                variableData.missing,
                0
              );

            const totalCount =
              validCount + missingCount;

            if (row.field === 'mean') {
              const mean =
                this.getNumericMean(variableData);

              return {
                ...row,
                [cohortLabel]:
                  mean !== null
                    ? Number(mean.toFixed(3))
                    : '-'
              };
            }

            if (row.field === 'missing') {
              return {
                ...row,
                [cohortLabel]:
                  this.formatMissingValue(
                    missingCount,
                    totalCount
                  )
              };
            }

            const rawValue =
              variableData[row.field];

            const numericValue = Number(rawValue);

            return {
              ...row,
              [cohortLabel]:
                rawValue !== undefined &&
                  rawValue !== null &&
                  Number.isFinite(numericValue)
                  ? Number(numericValue.toFixed(3))
                  : '-'
            };
          }
        );
      });
    }
    else if (this.selectedValue.datatype === 'Date') {
      variableCohorts = this.summaryTableDate.map(row => ({ ...row }));
      this.displayedColumnsCohorts.push('Statistics');

      this.summaryStatisticsCohorts.forEach((statistic: any, index: number) => {
        const variableData = statistic.rps_cohort?.date?.[variableId] || {};
        const cohortLabel = `Cohort ${index + 1}`;
        this.displayedColumnsCohorts.push(cohortLabel);

        variableCohorts = variableCohorts.map(
          (row: any) => {
            const validCount =
              this.toFiniteNumber(
                variableData.count,
                0
              );

            const missingCount =
              this.toFiniteNumber(
                variableData.missing,
                0
              );

            const totalCount =
              validCount + missingCount;

            if (row.field === 'missing') {
              return {
                ...row,
                [cohortLabel]:
                  this.formatMissingValue(
                    missingCount,
                    totalCount
                  )
              };
            }

            return {
              ...row,
              [cohortLabel]:
                this.formatValue(
                  variableData[row.field],
                  this.selectedValue.datatype,
                  row.field
                )
            };
          }
        );
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

      if (
        typeof value === 'number' &&
        Number.isInteger(value) &&
        value >= 1800 &&
        value <= 3000
      ) {
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

  updateCentersTable(): void {
    if (!this.selectedValue) {
      this.centersTables = {};
      this.displayedColumnsCenters = [];
      this.displayedColumnsCentersByCohort = {};
      this.centerCharts = [];
      return;
    }

    const variableName =
      this.selectedValue.variable_name;

    const variableId =
      this.selectedValue.variable_id;

    this.centersTables = {};
    this.displayedColumnsCenters = [];
    this.displayedColumnsCentersByCohort = {};

    Object.keys(
      this.summaryStatisticsCenters || {}
    ).forEach(cohortName => {
      const cohortCenters =
        this.summaryStatisticsCenters[
        cohortName
        ] || {};

      const centerNames =
        Object.keys(cohortCenters);

      if (!centerNames.length) {
        return;
      }

      const centerColumnNames =
        centerNames.map(centerName => {
          return this.getCenterColumnLabel(
            centerName,
            cohortCenters[centerName]
          );
        });

      const displayedColumns = [
        variableName,
        ...centerColumnNames
      ];

      this.displayedColumnsCentersByCohort[
        cohortName
      ] = displayedColumns;

      this.displayedColumnsCenters =
        displayedColumns;

      let variableCenters: any[] = [];

      if (
        this.selectedValue.datatype ===
        'Categorical' ||
        this.selectedValue.datatype ===
        'Boolean'
      ) {
        variableCenters =
          this.buildCategoricalCentersTable(
            cohortCenters,
            centerNames,
            variableName,
            variableId
          );
      } else if (
        this.isNumericVariableType(
          this.selectedValue.datatype
        )
      ) {
        variableCenters =
          this.buildNumericCentersTable(
            cohortCenters,
            centerNames,
            variableName,
            variableId
          );
      } else if (
        this.selectedValue.datatype === 'Date'
      ) {
        variableCenters =
          this.buildDateCentersTable(
            cohortCenters,
            centerNames,
            variableName,
            variableId
          );
      }

      this.centersTables[cohortName] =
        variableCenters;
    });

    this.buildCenterCharts();
  }

  private buildCategoricalCentersTable(
    cohortCenters: any,
    centerNames: string[],
    variableName: string,
    variableId: string
  ): any[] {
    const missingValues = new Set([
      'N/A',
      'N/A2'
    ]);

    const categoryKeys = new Set<string>();

    centerNames.forEach(centerName => {
      const variableData =
        cohortCenters[centerName]
          ?.counts_unique_values
        ?.[variableId] || {};

      Object.keys(variableData).forEach(
        categoryKey => {
          if (!missingValues.has(categoryKey)) {
            categoryKeys.add(categoryKey);
          }
        }
      );
    });

    const sortedCategoryKeys =
      Array.from(categoryKeys).sort(
        (left, right) => {
          const leftLabel =
            this.getCategoryDisplayValue(
              variableName,
              left
            );

          const rightLabel =
            this.getCategoryDisplayValue(
              variableName,
              right
            );

          return leftLabel.localeCompare(
            rightLabel,
            undefined,
            {
              sensitivity: 'base'
            }
          );
        }
      );

    const rowsByCategory: Record<string, any> = {};

    sortedCategoryKeys.forEach(categoryKey => {
      rowsByCategory[categoryKey] = {
        [variableName]:
          this.getCategoryDisplayValue(
            variableName,
            categoryKey
          )
      };

      centerNames.forEach(centerName => {
        const centerColumn =
          this.getCenterColumnLabel(
            centerName,
            cohortCenters[centerName]
          );

        rowsByCategory[categoryKey][
          centerColumn
        ] = 0;
      });
    });

    const missingRow: any = {
      [variableName]: 'Missing'
    };

    const totalRow: any = {
      [variableName]: 'Total'
    };

    centerNames.forEach(centerName => {
      const centerData =
        cohortCenters[centerName] || {};

      const centerColumn =
        this.getCenterColumnLabel(
          centerName,
          centerData
        );

      const variableData =
        centerData.counts_unique_values
        ?.[variableId] || {};

      const variableStatistics =
        centerData.categorical
        ?.[variableId] || {};

      sortedCategoryKeys.forEach(
        categoryKey => {
          const count = this.toFiniteNumber(
            variableData[categoryKey],
            0
          );

          rowsByCategory[categoryKey][
            centerColumn
          ] = count;
        }
      );

      const validCountFromCategories =
        sortedCategoryKeys.reduce(
          (sum, categoryKey) => {
            return (
              sum +
              this.toFiniteNumber(
                variableData[categoryKey],
                0
              )
            );
          },
          0
        );

      const explicitValidCount =
        this.toFiniteNumber(
          variableStatistics.count,
          0
        );

      const validCount =
        explicitValidCount > 0
          ? explicitValidCount
          : validCountFromCategories;

      const explicitMissingCount =
        this.toFiniteNumber(
          variableStatistics.missing,
          0
        );

      const missingFromValues =
        Object.keys(variableData)
          .filter(categoryKey =>
            missingValues.has(categoryKey)
          )
          .reduce((sum, categoryKey) => {
            return (
              sum +
              this.toFiniteNumber(
                variableData[categoryKey],
                0
              )
            );
          }, 0);

      /*
       * The explicit missing value is preferred because
       * the backend can already include N/A categories in it.
       */
      const missingCount =
        explicitMissingCount > 0
          ? explicitMissingCount
          : missingFromValues;

      const totalCount =
        this.getCenterTotal(
          centerData,
          validCount,
          missingCount
        );

      missingRow[centerColumn] =
        this.formatMissingValue(
          missingCount,
          totalCount
        );

      totalRow[centerColumn] =
        totalCount;
    });

    return [
      ...sortedCategoryKeys.map(
        categoryKey =>
          rowsByCategory[categoryKey]
      ),
      missingRow,
      totalRow
    ];
  }

  private getCategoryDisplayValue(
    variableName: string,
    categoryValue: string
  ): string {
    if (variableName === 'topography') {
      return this.mapTopographyValue(categoryValue);
    }

    return categoryValue;
  }
  private buildNumericCentersTable(
    cohortCenters: any,
    centerNames: string[],
    variableName: string,
    variableId: string
  ): any[] {
    return this.summaryTableNum.map(
      summaryRow => {
        const resultRow: any = {
          [variableName]: summaryRow.Statistics
        };

        centerNames.forEach(centerName => {
          const centerData =
            cohortCenters[centerName] || {};

          const centerColumn =
            this.getCenterColumnLabel(
              centerName,
              centerData
            );

          const variableData =
            centerData.numeric
            ?.[variableId] || {};

          const validCount =
            this.toFiniteNumber(
              variableData.count,
              0
            );

          const missingCount =
            this.toFiniteNumber(
              variableData.missing,
              0
            );

          const totalCount =
            this.getCenterTotal(
              centerData,
              validCount,
              missingCount
            );

          if (summaryRow.field === 'mean') {
            const mean =
              this.getNumericMean(variableData);

            resultRow[centerColumn] =
              mean !== null
                ? Number(mean.toFixed(3))
                : '-';

            return;
          }

          if (summaryRow.field === 'missing') {
            resultRow[centerColumn] =
              this.formatMissingValue(
                missingCount,
                totalCount
              );

            return;
          }

          const rawValue =
            variableData[summaryRow.field];

          if (
            rawValue === undefined ||
            rawValue === null ||
            rawValue === ''
          ) {
            resultRow[centerColumn] = '-';
            return;
          }

          const numericValue = Number(rawValue);

          resultRow[centerColumn] =
            Number.isFinite(numericValue)
              ? Number(numericValue.toFixed(3))
              : '-';
        });

        return resultRow;
      }
    );
  }

  private buildDateCentersTable(
    cohortCenters: any,
    centerNames: string[],
    variableName: string,
    variableId: string
  ): any[] {
    return this.summaryTableDate.map(
      summaryRow => {
        const resultRow: any = {
          [variableName]: summaryRow.Statistics
        };

        centerNames.forEach(centerName => {
          const centerData =
            cohortCenters[centerName] || {};

          const centerColumn =
            this.getCenterColumnLabel(
              centerName,
              centerData
            );

          const variableData =
            centerData.date
            ?.[variableId] || {};

          const validCount =
            this.toFiniteNumber(
              variableData.count,
              0
            );

          const missingCount =
            this.toFiniteNumber(
              variableData.missing,
              0
            );

          const totalCount =
            this.getCenterTotal(
              centerData,
              validCount,
              missingCount
            );

          if (summaryRow.field === 'missing') {
            resultRow[centerColumn] =
              this.formatMissingValue(
                missingCount,
                totalCount
              );

            return;
          }

          resultRow[centerColumn] =
            this.formatValue(
              variableData[summaryRow.field],
              'Date',
              summaryRow.field
            );
        });

        return resultRow;
      }
    );
  }

  private buildBoxPlotChart(
    cohortCenters: any,
    centers: string[],
    variableId: string
  ): any | null {
    const centersWithDistribution =
      centers.filter(centerName => {
        const statistics =
          cohortCenters[centerName]
            ?.numeric
          ?.[variableId];

        return this.hasBoxPlotStatistics(
          statistics
        );
      });

    if (!centersWithDistribution.length) {
      return null;
    }

    const boxPlotData =
      centersWithDistribution.map(centerName => {
        const statistics =
          cohortCenters[centerName]
            ?.numeric
          ?.[variableId] || {};

        return {
          x: centerName,
          y: [
            Number(statistics.min),
            Number(statistics.q_25),
            Number(statistics.median),
            Number(statistics.q_75),
            Number(statistics.max)
          ]
        };
      });

    const meanData =
      centersWithDistribution
        .map(centerName => {
          const statistics =
            cohortCenters[centerName]
              ?.numeric
            ?.[variableId] || {};

          const mean = Number(statistics.mean);

          if (!Number.isFinite(mean)) {
            return null;
          }

          return {
            x: centerName,
            y: mean
          };
        })
        .filter(
          (
            point
          ): point is {
            x: string;
            y: number;
          } => point !== null
        );

    return {
      series: [
        {
          name: 'Distribution',
          type: 'boxPlot',
          data: boxPlotData
        },
        {
          name: 'Mean',
          type: 'scatter',
          data: meanData
        }
      ],

      chart: {
        type: 'boxPlot',
        height: 360,
        toolbar: {
          show: true
        },
        animations: {
          enabled: true
        }
      },

      plotOptions: {
        boxPlot: {
          colors: {
            upper: '#255e87',
            lower: '#99abb4'
          }
        }
      },

      xaxis: {
        type: 'category',
        categories: centersWithDistribution,
        labels: {
          rotate: -35,
          trim: false
        },
        title: {
          text: 'Center'
        }
      },

      yaxis: {
        title: {
          text:
            this.selectedValue.display_name ||
            this.formatVariableName(
              this.selectedValue.variable_name
            )
        },
        labels: {
          formatter: (value: number) =>
            this.formatChartNumber(value)
        }
      },

      dataLabels: {
        enabled: false
      },

      markers: {
        size: 6,
        colors: ['#f59e0b'],
        strokeColors: '#ffffff',
        strokeWidth: 2,
        hover: {
          size: 8
        }
      },

      stroke: {
        width: 2
      },

      colors: [
        '#255e87',
        '#f59e0b'
      ],

      legend: {
        show: true,
        position: 'top'
      },

      tooltip: {
        shared: false,
        intersect: true
      }
    };
  }

  buildCenterCharts(): void {
    if (!this.selectedValue) {
      this.centerCharts = [];
      return;
    }

    const variableId =
      this.selectedValue.variable_id;

    const datatype =
      this.selectedValue.datatype;

    const selectedCenterKeys = new Set(
      this.centerFilters
        .filter(center => center.selected)
        .map(center => center.key)
    );

    this.centerCharts = Object.keys(
      this.summaryStatisticsCenters || {}
    )
      .filter(cohortName =>
        this.isSummaryCohortSelected(cohortName)
      )
      .map(cohortName => {
        const cohortCenters =
          this.summaryStatisticsCenters[
          cohortName
          ] || {};

        const centers =
          this.getEffectiveCentersForCohort(
            cohortCenters,
            selectedCenterKeys
          );

        if (!centers.length) {
          return null;
        }

        const distributionChart =
          this.isNumericVariableType(datatype)
            ? this.buildBoxPlotChart(
              cohortCenters,
              centers,
              variableId
            )
            : null;

        const missingChart =
          this.buildMissingChart(
            cohortCenters,
            centers,
            variableId,
            datatype
          );

        return {
          cohort: cohortName,
          distributionChart,
          missingChart
        };
      })
      .filter(
        (
          item
        ): item is {
          cohort: string;
          distributionChart: any | null;
          missingChart: any;
        } => item !== null
      );
  }

  private buildMissingChart(
    cohortCenters: any,
    centers: string[],
    variableId: string,
    datatype: string
  ): any {
    const missingData = centers.map(
      centerName => {
        const centerData =
          cohortCenters[centerName] || {};

        const missingStatistics =
          this.getMissingStatistics(
            centerData,
            variableId,
            datatype
          );

        return Number(
          missingStatistics.percentage.toFixed(1)
        );
      }
    );

    return {
      series: [
        {
          name: 'Missing',
          data: missingData
        }
      ],

      chart: {
        type: 'bar',
        height: Math.max(
          220,
          centers.length * 55
        ),
        toolbar: {
          show: true
        }
      },

      plotOptions: {
        bar: {
          horizontal: true,
          borderRadius: 4,
          barHeight: '55%',
          dataLabels: {
            position: 'center'
          }
        }
      },

      xaxis: {
        categories: centers,
        min: 0,
        max: 100,
        tickAmount: 5,
        title: {
          text: 'Missing values (%)'
        },
        labels: {
          formatter: (value: number) =>
            `${Number(value).toFixed(0)}%`
        }
      },

      yaxis: {
        labels: {
          maxWidth: 180
        }
      },

      dataLabels: {
        enabled: true,
        formatter: (value: number) =>
          `${Number(value).toFixed(1)}%`,
        style: {
          colors: ['#ffffff']
        }
      },

      colors: ['#d97706'],

      tooltip: {
        y: {
          formatter: (
            value: number,
            options: any
          ) => {
            const centerIndex =
              options.dataPointIndex;

            const centerName =
              centers[centerIndex];

            const statistics =
              this.getMissingStatistics(
                cohortCenters[centerName] || {},
                variableId,
                datatype
              );

            return (
              `${statistics.missing} of ` +
              `${statistics.total} ` +
              `(${value.toFixed(1)}%)`
            );
          }
        }
      },

      legend: {
        show: false
      }
    };
  }

  private getMissingStatistics(
    centerData: any,
    variableId: string,
    datatype: string
  ): {
    valid: number;
    missing: number;
    total: number;
    percentage: number;
  } {
    let variableStatistics: any = {};
    let validCount = 0;
    let missingCount = 0;

    if (
      datatype === 'Number' ||
      datatype === 'Float'
    ) {
      variableStatistics =
        centerData.numeric?.[variableId] || {};

      validCount = this.toFiniteNumber(
        variableStatistics.count,
        0
      );

      missingCount = this.toFiniteNumber(
        variableStatistics.missing,
        0
      );
    } else if (datatype === 'Date') {
      variableStatistics =
        centerData.date?.[variableId] || {};

      validCount = this.toFiniteNumber(
        variableStatistics.count,
        0
      );

      missingCount = this.toFiniteNumber(
        variableStatistics.missing,
        0
      );
    } else if (
      datatype === 'Categorical' ||
      datatype === 'Boolean'
    ) {
      const values =
        centerData.counts_unique_values
        ?.[variableId] || {};

      variableStatistics =
        centerData.categorical
        ?.[variableId] || {};

      const missingKeys = new Set([
        'N/A',
        'N/A2'
      ]);

      const validFromCategories =
        Object.keys(values)
          .filter(key => !missingKeys.has(key))
          .reduce((sum, key) => {
            return (
              sum +
              this.toFiniteNumber(
                values[key],
                0
              )
            );
          }, 0);

      const explicitValid =
        this.toFiniteNumber(
          variableStatistics.count,
          0
        );

      validCount =
        explicitValid > 0
          ? explicitValid
          : validFromCategories;

      const missingFromValues =
        Object.keys(values)
          .filter(key => missingKeys.has(key))
          .reduce((sum, key) => {
            return (
              sum +
              this.toFiniteNumber(
                values[key],
                0
              )
            );
          }, 0);

      const explicitMissing =
        this.toFiniteNumber(
          variableStatistics.missing,
          0
        );

      missingCount =
        explicitMissing > 0
          ? explicitMissing
          : missingFromValues;
    }

    const totalCount =
      this.getCenterTotal(
        centerData,
        validCount,
        missingCount
      );

    const percentage =
      totalCount > 0
        ? (missingCount / totalCount) * 100
        : 0;

    return {
      valid: validCount,
      missing: missingCount,
      total: totalCount,
      percentage
    };
  }

  private hasBoxPlotStatistics(
    statistics: any
  ): boolean {
    if (!statistics) {
      return false;
    }

    const requiredValues = [
      statistics.min,
      statistics.q_25,
      statistics.median,
      statistics.q_75,
      statistics.max
    ];

    return requiredValues.every(value => {
      if (
        value === undefined ||
        value === null ||
        value === ''
      ) {
        return false;
      }

      return Number.isFinite(Number(value));
    });
  }

  private toFiniteNumber(
    value: any,
    fallback = 0
  ): number {
    if (
      value === undefined ||
      value === null ||
      value === ''
    ) {
      return fallback;
    }

    const numericValue = Number(value);

    return Number.isFinite(numericValue)
      ? numericValue
      : fallback;
  }

  private formatChartNumber(
    value: number
  ): string {
    if (!Number.isFinite(Number(value))) {
      return '-';
    }

    return Number(value).toLocaleString(
      undefined,
      {
        maximumFractionDigits: 3
      }
    );
  }

  private isSummaryCohortSelected(
    summaryCohortName: string
  ): boolean {
    const selectedFilters =
      this.cohortFilters.filter(
        cohort => cohort.selected
      );

    if (!selectedFilters.length) {
      return true;
    }

    const originalCohortName =
      this.getOriginalCohortName(
        summaryCohortName,
        summaryCohortName
      );

    return selectedFilters.some(cohort => {
      return (
        cohort.key === summaryCohortName ||
        cohort.label === summaryCohortName ||
        cohort.key === originalCohortName ||
        cohort.label === originalCohortName
      );
    });
  }

  getEffectiveCentersForCohort(
    cohortCenters: any,
    selectedCenterKeys: Set<string>
  ): string[] {
    const allCenters = Object.keys(
      cohortCenters || {}
    );

    if (!selectedCenterKeys.size) {
      return allCenters;
    }

    const filteredCenters =
      allCenters.filter(center =>
        selectedCenterKeys.has(center)
      );

    /*
     * Permit labels and result keys can differ.
     * In that case all result centers remain available.
     */
    return filteredCenters.length
      ? filteredCenters
      : allCenters;
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
          case 'annotate_treatments':
            requestObservable = this.dataAnalysisService.createAnnotateTreatments(data);
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
    // this.summaryStatisticsCenters = centersSummary;
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
      label: this.getCenterDisplayLabel(label),
      selected: previousByKey.has(label) ? Boolean(previousByKey.get(label)) : true
    }));
  }

  getCenterDisplayLabel(centerKey: string): string {
    const displayAliases: Record<string, string> = {
      UPM: 'IIS-FJD'
    };
    return displayAliases[String(centerKey).trim().toUpperCase()] ?? centerKey;
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
        const centersSummary: any = {};

        const orgMap: Record<string, string> = {
          '5': 'UKE',
          '4': 'INT',
          '7': 'FPNS',
          '9': 'OUS',
          '10': 'MSCI',
          '6': 'CLB',
          '11': 'APHP',
          '8': 'VGR',
          '1': 'IIS-FJD',
        };

        this.resultGlobal = result.result;

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


          centersSummary[cohortName] = {};

          const partials = nodeData.partials || [];

          partials.forEach((partial: any) => {
            const orgId = String(partial.organization_id);
            let numRows = 0;
            const rawNumRows = partial.num_rows_per_node;

            if (!orgId) {
              console.warn('No organization_id found in partial', partial);
              return;
            }

            const centerKey = orgMap[orgId] || `ORG_${orgId}`;

            if (typeof rawNumRows === 'number') {
              numRows = rawNumRows;
            } else if (typeof rawNumRows === 'object' && rawNumRows !== null) {
              const values = Object.values(rawNumRows);
              numRows = values.length > 0 ? Number(values[0]) : 0;
            } else {
              console.warn('Unexpected num_rows_per_node format', rawNumRows);
            }

            centersSummary[cohortName][centerKey] = {
              organization_id: orgId,
              numeric: partial.numeric || {},
              counts_unique_values: partial.counts_unique_values || {},
              categorical: partial.categorical || {},
              date: partial.date || {},
              num_rows: numRows
            };
          });
        });

        this.summaryStatisticsCohorts = summary;
        this.summaryStatisticsCenters = centersSummary;

        // console.log("summaryStatisticsCenters: ", this.summaryStatisticsCenters);
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
    this.centerCharts = [];

    this.dataSourceCohorts.data = [];
    this.displayedColumnsCohorts = [];

    this.dataSourceCenters.data = [];
    this.displayedColumnsCenters = [];
    this.cohortStatusList = [];
    this.displayedColumnsCentersByCohort = {};
  }

  filterVariables(search: string) {
    const filterValue = (search || '').toLowerCase().trim();

    if (!filterValue) {
      this.filteredVariables = [...this.optionsVariables];
      return;
    }

    this.filteredVariables = this.optionsVariables.filter(variable => {
      const variableName = String(variable.variable_name || '').toLowerCase();
      const displayName = String(variable.display_name || '').toLowerCase();
      return (
        variableName.includes(filterValue) ||
        displayName.includes(filterValue)
      );
    });

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

  formatHeader(column: string): string {
    if (column === 'Statistics') {
      return column;
    }

    if (column.startsWith('Cohort ')) {
      return this.cohortColumnLabelMap[column] || column;
    }

    return this.formatVariableName(column);
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

  // private mapTopographyValue(value: string): string {
  //   return this.topographyMap[value] || value;
  // }

  private mapTopographyValue(value: string): string {
    let result = value
    if (value && value != "N/A")
      result = this.topographyMap[value] + " (" + value + ")"

    return result
  }

  onVariableSelectOpened(opened: boolean): void {
    this.variableFilterCtrl.setValue('', { emitEvent: false });
    this.filteredVariables = [...this.optionsVariables];
    this.groupVariables(this.filteredVariables);
  }

  getOriginalCohortName(vantage6Name: string, fallback: string): string {
    const matchedCohort = this.allCohorts.find((cohort: any) =>
      String(cohort?.vantage6_cohort_name || '') === String(vantage6Name || '')
    );

    return matchedCohort?.cohort_name || fallback;
  }

  private getCenterTotal(
    centerData: any,
    validCount: number,
    missingCount: number
  ): number {
    const numberOfRows = this.toFiniteNumber(
      centerData?.num_rows,
      0
    );

    if (numberOfRows > 0) {
      return numberOfRows;
    }

    return validCount + missingCount;
  }

  private getCenterColumnLabel(
    centerName: string,
    centerData: any
  ): string {
    const numberOfRows = this.toFiniteNumber(
      centerData?.num_rows,
      0
    );

    if (numberOfRows <= 0) {
      return centerName;
    }

    return `${centerName} (n=${numberOfRows})`;
  }

  private formatMissingValue(
    missingCount: number,
    totalCount: number
  ): string {
    const percentage =
      totalCount > 0
        ? (missingCount / totalCount) * 100
        : 0;

    return (
      `${missingCount} ` +
      `(${percentage.toFixed(1)}%)`
    );
  }

  private getNumericMean(
    statistics: any
  ): number | null {
    if (!statistics) {
      return null;
    }

    const explicitMean = Number(
      statistics.mean
    );

    if (
      statistics.mean !== undefined &&
      statistics.mean !== null &&
      Number.isFinite(explicitMean)
    ) {
      return explicitMean;
    }

    const sum = Number(statistics.sum);
    const count = Number(statistics.count);

    if (
      Number.isFinite(sum) &&
      Number.isFinite(count) &&
      count > 0
    ) {
      return sum / count;
    }

    return null;
  }
}
