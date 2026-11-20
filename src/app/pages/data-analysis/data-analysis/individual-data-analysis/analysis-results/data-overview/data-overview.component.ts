import { Component, Input, OnChanges, OnDestroy, SimpleChanges } from '@angular/core';
import { Subscription } from 'rxjs';
import { DataAnalysisService } from '../../../data-analysis.service';

type VariableDatatype =
  | 'Numeric'
  | 'Categorical'
  | 'Boolean'
  | 'Date'
  | 'Unknown';

interface OverviewColumn {
  key: string;
  label: string;
}

interface OverviewRow {
  label: string;
  values: Record<string, string | number>;
  isSummary?: boolean;
}

interface OverviewTable {
  firstColumnLabel: string;
  columns: OverviewColumn[];
  rows: OverviewRow[];
}

interface CenterOverviewTable {
  cohortKey: string;
  cohortLabel: string;
  table: OverviewTable;
}

interface OverviewChartGroup {
  cohortKey: string;
  cohortLabel: string;
  distributionChart: any | null;
  meanChart: any | null;
  missingChart: any;
}

interface VariableOverview {
  name: string;
  label: string;
  role: string;
  datatype: VariableDatatype;
  cohortTable: OverviewTable;
  centerTables: CenterOverviewTable[];
  chartGroups: OverviewChartGroup[];
}

interface MissingStatistics {
  valid: number;
  missing: number;
  total: number;
  percentage: number;
}

@Component({
  selector: 'app-data-overview',
  templateUrl: './data-overview.component.html',
  styleUrl: './data-overview.component.scss'
})
export class DataOverviewComponent
  implements OnChanges, OnDestroy {

  @Input() selectedAlgorithm: any = null;
  @Input() selectedCohorts: any[] = [];

  @Input()
  topographyMap: Record<string, string> = {};

  loading = false;
  errorMessage = '';

  summaryResult: any = null;
  variables: VariableOverview[] = [];

  private summarySubscription?: Subscription;
  private requestVersion = 0;

  private readonly organizationMap:
    Record<string, string> = {
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

  private readonly missingCategoryValues =
    new Set([
      'N/A',
      'N/A2'
    ]);

  constructor(private dataAnalysisService: DataAnalysisService) { }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['selectedAlgorithm'] || changes['selectedCohorts']) {
      this.initializeOverview();
    }
  }

  ngOnDestroy(): void {
    this.summarySubscription?.unsubscribe();
  }

  get isOverviewNotApplicable(): boolean {
    const methodName = String(this.selectedAlgorithm?.method_name || '').toLowerCase();
    return methodName === 'table1' || methodName === 't-test';
  }

  get overviewNotApplicableTitle(): string {
    const methodName = String(this.selectedAlgorithm?.method_name || '').toLowerCase();

    if (methodName === 'table1') {
      return 'Data overview is not applicable to Table 1';
    }

    if (methodName === 't-test') {
      return 'Data overview is not applicable to T-test';
    }

    return 'Data overview is not applicable';
  }

  get overviewNotApplicableMessage(): string {
    const methodName = String(this.selectedAlgorithm?.method_name || '').toLowerCase();

    if (methodName === 'table1') {
      return 'Table 1 already summarizes all available variables, so an additional data overview would duplicate the analysis results.';
    }

    if (methodName === 't-test') {
      return 'This T-test execution does not use selected input variables, so there are no algorithm variables to summarize.';
    }

    return 'No additional data overview is available for this algorithm.';
  }

  get hasVariables(): boolean {
    return this.variables.length > 0;
  }

  trackVariable(index: number, variable: VariableOverview): string {
    return variable.name;
  }

  trackCenterTable(index: number, centerTable: CenterOverviewTable): string {
    return centerTable.cohortKey;
  }

  trackChartGroup(index: number, chartGroup: OverviewChartGroup): string {
    return chartGroup.cohortKey;
  }

  trackColumn(index: number, column: OverviewColumn): string {
    return column.key;
  }

  trackRow(index: number, row: OverviewRow): string {
    return `${row.label}-${index}`;
  }

  private initializeOverview(): void {
    this.summarySubscription?.unsubscribe();

    this.requestVersion += 1;
    const currentRequestVersion = this.requestVersion;

    this.loading = false;
    this.errorMessage = '';
    this.summaryResult = null;
    this.variables = [];

    if (!this.selectedAlgorithm) {
      return;
    }

    if (this.isOverviewNotApplicable) {
      return;
    }

    const variableNames = this.extractAlgorithmVariables();

    if (!variableNames.length) {
      this.errorMessage = 'No variables could be identified for this algorithm.';
      return;
    }

    const cohortIds = this.selectedCohorts.map(cohort => cohort?.id).filter(
      (cohortId):
        cohortId is number =>
        cohortId !== undefined &&
        cohortId !== null
    );

    if (!cohortIds.length) {
      this.errorMessage = 'No cohorts are available for this data overview.';
      return;
    }

    this.loading = true;

    const body = { cohort_ids: cohortIds };
    this.summarySubscription = this.dataAnalysisService.existsSummaryByCohort(body).subscribe({
      next: response => {
        if (currentRequestVersion !== this.requestVersion) {
          return;
        }

        const summaries = this.normalizeSummaryList(response);

        const latestSummary = this.getLatestSummary(summaries);

        const taskId = Number(latestSummary?.task_id ?? 0);

        if (taskId <= 0) {
          this.loading = false;
          this.errorMessage = 'No completed summary is available for the selected cohorts.';
          return;
        }

        this.loadSummaryResult(taskId, variableNames, currentRequestVersion);
      },
      error: error => {
        console.error('Error loading the existing summary:', error
        );

        if (currentRequestVersion !== this.requestVersion) {
          return;
        }

        this.loading = false;
        this.errorMessage = 'The existing summary could not be loaded.';
      }
    });
  }

  private loadSummaryResult(taskId: number, variableNames: string[], requestVersion: number): void {
    this.summarySubscription = this.dataAnalysisService.getTaskResult(taskId).subscribe({
      next: response => {
        if (requestVersion !== this.requestVersion) {
          return;
        }

        this.summaryResult = response?.result ?? response ?? {};

        this.variables = variableNames.map(variableName => this.buildVariableOverview(variableName));

        this.loading = false;
      },
      error: error => {
        console.error('Error loading the summary result:', error);
        if (
          requestVersion !== this.requestVersion) {
          return;
        }

        this.loading = false;
        this.errorMessage = 'The summary result could not be loaded.';
      }
    });
  }

  private normalizeSummaryList(response: any):
    any[] {
    if (Array.isArray(response)) {
      return response;
    }

    if (Array.isArray(response?.summaries)) {
      return response.summaries;
    }

    if (Array.isArray(response?.algorithms)) {
      return response.algorithms;
    }

    return [];
  }

  private getLatestSummary(summaries: any[]):
    any | null {
    if (!summaries.length) {
      return null;
    }

    return [...summaries].sort(
      (left, right) => {
        const leftId = Number(
          left?.id ?? 0
        );

        const rightId = Number(
          right?.id ?? 0
        );

        return rightId - leftId;
      }
    )[0];
  }

  private extractAlgorithmVariables():
    string[] {
    const variables: string[] = [];

    const rowVariables = this.parseVariableList(this.selectedAlgorithm?.row_var_list);
    rowVariables.forEach(variable => variables.push(variable));

    const columnVariable = String(this.selectedAlgorithm?.col_var || '').trim();

    if (columnVariable) { variables.push(columnVariable); }

    const inputVariables = this.extractVariablesFromInput(this.selectedAlgorithm?.input);

    inputVariables.forEach(variable => variables.push(variable));

    const uniqueVariables = new Map<string, string>();

    variables.forEach(variable => {
      const normalized = this.normalizeVariableName(variable);

      if (normalized && !uniqueVariables.has(normalized)) {
        uniqueVariables.set(normalized, variable);
      }
    });

    return Array.from(uniqueVariables.values()
    );
  }

  private parseVariableList(value: unknown
  ): string[] {
    if (Array.isArray(value)) {
      return value.map(item => String(item).trim()).filter(Boolean);
    }

    if (typeof value !== 'string') {
      return [];
    }

    return value.split(',').map(item => item.trim()).filter(Boolean);
  }


  private extractVariablesFromInput(input: unknown): string[] {
    if (input === undefined || input === null || input === '') {
      return [];
    }

    let parsedInput: unknown = input;

    if (typeof input === 'string') {
      try {
        parsedInput = JSON.parse(input);
      } catch {
        return this.parseVariableList(input);
      }
    }

    if (Array.isArray(parsedInput)) {
      return parsedInput
        .filter(value => typeof value === 'string')
        .map(value => String(value).trim())
        .filter(Boolean);
    }

    if (!parsedInput || typeof parsedInput !== 'object') {
      return [];
    }

    const variables: string[] = [];
    const variablePropertyNames = new Set([
      'variable',
      'variables',
      'variableslist',
      'variablelist',
      'rowvariable',
      'rowvariables',
      'columnvariable',
      'columnvariables',
      'dependentvariable',
      'independentvariable',
      'independentvariables',
      'outcomevariable',
      'predictorvariable',
      'predictorvariables',
      'covariate',
      'covariates',
      'timevariable',
      'eventvariable',
      'groupvariable',
      'timecolumn',
      'censorcolumn',
      'stratacolumn',
      'timecol',
      'outcomecol',
      'explvars'
    ]);

    Object.entries(parsedInput).forEach(([propertyName, propertyValue]) => {
      const normalizedPropertyName = propertyName
        .replace(/[_\s-]/g, '')
        .toLowerCase();

      if (!variablePropertyNames.has(normalizedPropertyName)) {
        return;
      }

      if (Array.isArray(propertyValue)) {
        propertyValue.forEach(value => {
          if (typeof value === 'string' && value.trim()) {
            variables.push(value.trim());
          }
        });

        return;
      }

      if (typeof propertyValue === 'string') {
        this.parseVariableList(propertyValue).forEach(variable => {
          variables.push(variable);
        });
      }
    });

    return variables;
  }

  private buildVariableOverview(
    variableName: string
  ): VariableOverview {
    const datatype =
      this.detectVariableDatatype(
        variableName
      );

    return {
      name: variableName,
      label: this.formatLabel(variableName),
      role: this.getVariableRole(
        variableName
      ),
      datatype,
      cohortTable:
        this.buildCohortTable(
          variableName,
          datatype
        ),
      centerTables:
        this.buildCenterTables(
          variableName,
          datatype
        ),
      chartGroups:
        this.buildChartGroups(
          variableName,
          datatype
        )
    };
  }

  private detectVariableDatatype(
    variableName: string
  ): VariableDatatype {
    const cohortNames = Object.keys(
      this.summaryResult || {}
    );

    for (const cohortName of cohortNames) {
      const cohortData =
        this.summaryResult[cohortName] || {};

      if (
        cohortData.numeric?.[
        variableName
        ] !== undefined
      ) {
        return 'Numeric';
      }

      if (
        cohortData.date?.[
        variableName
        ] !== undefined
      ) {
        return 'Date';
      }

      if (
        cohortData.counts_unique_values?.[
        variableName
        ] !== undefined
      ) {
        const values =
          cohortData
            .counts_unique_values[
          variableName
          ] || {};

        const categoryKeys =
          Object.keys(values)
            .filter(
              key =>
                !this.missingCategoryValues
                  .has(key)
            )
            .map(key =>
              key.toLowerCase()
            );

        if (
          categoryKeys.length > 0 &&
          categoryKeys.every(
            key =>
              key === 'true' ||
              key === 'false'
          )
        ) {
          return 'Boolean';
        }

        return 'Categorical';
      }
    }

    return 'Unknown';
  }

  private getVariableRole(variableName: string): string {
    const methodName = String(this.selectedAlgorithm?.method_name || '').toLowerCase();
    const normalizedVariable = this.normalizeVariableName(variableName);

    switch (methodName) {
      case 'crosstabulation':
        return this.getCrosstabulationVariableRole(normalizedVariable);

      case 'kaplan-meier':
        return this.getKaplanMeierVariableRole(normalizedVariable);

      case 'glm':
        return this.getGlmVariableRole(normalizedVariable);

      case 'coxph':
        return this.getCoxPhVariableRole(normalizedVariable);

      default:
        return 'Algorithm variable';
    }
  }

  private getCrosstabulationVariableRole(normalizedVariable: string): string {
    const rowVariables = this.parseVariableList(this.selectedAlgorithm?.row_var_list)
      .map(variable => this.normalizeVariableName(variable));

    if (rowVariables.includes(normalizedVariable)) {
      return 'Row variable';
    }

    const columnVariable = this.normalizeVariableName(this.selectedAlgorithm?.col_var);

    if (columnVariable === normalizedVariable) {
      return 'Column variable';
    }

    return 'Algorithm variable';
  }

  private getKaplanMeierVariableRole(normalizedVariable: string): string {
    const inputVariables = this.extractVariablesFromInput(this.selectedAlgorithm?.input)
      .map(variable => this.normalizeVariableName(variable));

    if (inputVariables[0] === normalizedVariable) {
      return 'Time variable';
    }

    if (inputVariables[1] === normalizedVariable) {
      return 'Censor variable';
    }

    if (inputVariables[2] === normalizedVariable) {
      return 'Strata variable';
    }

    return 'Algorithm variable';
  }


  private getGlmVariableRole(normalizedVariable: string): string {
    const parsedInput = this.parseAlgorithmInputObject();

    const outcomeVariable = this.normalizeVariableName(
      parsedInput['outcome_variable'] ?? parsedInput['outcomeVariable']
    );

    if (outcomeVariable === normalizedVariable) {
      return 'Outcome variable';
    }

    const predictorVariables = this.toVariableArray(
      parsedInput['predictor_variables'] ?? parsedInput['predictorVariables']
    ).map(variable => this.normalizeVariableName(variable));

    if (predictorVariables.includes(normalizedVariable)) {
      return 'Predictor variable';
    }

    return 'Algorithm variable';
  }

  private getCoxPhVariableRole(normalizedVariable: string): string {
    const parsedInput = this.parseAlgorithmInputObject();

    const timeVariable = this.normalizeVariableName(
      parsedInput['time_col'] ?? parsedInput['timeColumn']
    );

    if (timeVariable === normalizedVariable) {
      return 'Time variable';
    }

    const outcomeVariable = this.normalizeVariableName(
      parsedInput['outcome_col'] ?? parsedInput['outcomeColumn']
    );

    if (outcomeVariable === normalizedVariable) {
      return 'Outcome variable';
    }

    const explanatoryVariables = this.toVariableArray(
      parsedInput['expl_vars'] ?? parsedInput['explanatoryVariables']
    ).map(variable => this.normalizeVariableName(variable));

    if (explanatoryVariables.includes(normalizedVariable)) {
      return 'Explanatory variable';
    }

    return 'Algorithm variable';
  }
  private parseAlgorithmInputObject(): Record<string, any> {
    const input = this.selectedAlgorithm?.input;

    if (!input) {
      return {};
    }

    if (typeof input === 'object' && !Array.isArray(input)) {
      return input as Record<string, any>;
    }

    if (typeof input !== 'string') {
      return {};
    }

    try {
      const parsedInput = JSON.parse(input);

      return parsedInput && typeof parsedInput === 'object' && !Array.isArray(parsedInput)
        ? parsedInput
        : {};
    } catch {
      return {};
    }
  }

  private toVariableArray(value: unknown): string[] {
    if (Array.isArray(value)) {
      return value
        .filter(item => typeof item === 'string')
        .map(item => String(item).trim())
        .filter(Boolean);
    }

    return this.parseVariableList(value);
  }

  private buildCohortTable(
    variableName: string,
    datatype: VariableDatatype
  ): OverviewTable {
    const cohortKeys = Object.keys(
      this.summaryResult || {}
    );

    const columns: OverviewColumn[] =
      cohortKeys.map(
        (cohortKey, index) => {
          const cohortData =
            this.summaryResult[
            cohortKey
            ] || {};

          const total =
            this.getVariableTotal(
              cohortData,
              variableName,
              datatype
            );

          return {
            key: `cohort-${index}`,
            label:
              total > 0
                ? `${this.getCohortLabel(
                  cohortKey
                )} (n=${total})`
                : this.getCohortLabel(
                  cohortKey
                )
          };
        }
      );

    if (datatype === 'Numeric') {
      return this.buildNumericTable(
        variableName,
        cohortKeys.map(
          (cohortKey, index) => ({
            key: `cohort-${index}`,
            data:
              this.summaryResult[
              cohortKey
              ] || {}
          })
        ),
        columns,
        'Statistics'
      );
    }

    if (datatype === 'Date') {
      return this.buildDateTable(
        variableName,
        cohortKeys.map(
          (cohortKey, index) => ({
            key: `cohort-${index}`,
            data:
              this.summaryResult[
              cohortKey
              ] || {}
          })
        ),
        columns,
        'Statistics'
      );
    }

    return this.buildCategoricalTable(
      variableName,
      datatype,
      cohortKeys.map(
        (cohortKey, index) => ({
          key: `cohort-${index}`,
          data:
            this.summaryResult[
            cohortKey
            ] || {}
        })
      ),
      columns,
      this.formatLabel(variableName)
    );
  }

  private buildCenterTables(
    variableName: string,
    datatype: VariableDatatype
  ): CenterOverviewTable[] {
    return Object.keys(
      this.summaryResult || {}
    ).map(cohortKey => {
      const cohortData =
        this.summaryResult[
        cohortKey
        ] || {};

      const centerDataList =
        this.extractCenterData(
          cohortData
        );

      const columns: OverviewColumn[] =
        centerDataList.map(
          (centerData, index) => {
            const total =
              this.getVariableTotal(
                centerData,
                variableName,
                datatype
              );

            const centerName =
              this.getCenterName(
                centerData
                  ?.organization_id
              );

            return {
              key: `center-${index}`,
              label:
                total > 0
                  ? `${centerName} (n=${total})`
                  : centerName
            };
          }
        );

      const sources =
        centerDataList.map(
          (centerData, index) => ({
            key: `center-${index}`,
            data: centerData
          })
        );

      let table: OverviewTable;

      if (datatype === 'Numeric') {
        table = this.buildNumericTable(
          variableName,
          sources,
          columns,
          'Statistics'
        );
      } else if (datatype === 'Date') {
        table = this.buildDateTable(
          variableName,
          sources,
          columns,
          'Statistics'
        );
      } else {
        table =
          this.buildCategoricalTable(
            variableName,
            datatype,
            sources,
            columns,
            this.formatLabel(variableName)
          );
      }

      return {
        cohortKey,
        cohortLabel:
          this.getCohortLabel(cohortKey),
        table
      };
    });
  }

  private buildNumericTable(
    variableName: string,
    sources: Array<{
      key: string;
      data: any;
    }>,
    columns: OverviewColumn[],
    firstColumnLabel: string
  ): OverviewTable {
    const definitions = [
      {
        label: 'N',
        field: 'count'
      },
      {
        label: 'Mean',
        field: 'mean'
      },
      {
        label: 'Min',
        field: 'min'
      },
      {
        label: 'Max',
        field: 'max'
      },
      {
        label: 'Missing',
        field: 'missing'
      }
    ];

    const rows: OverviewRow[] =
      definitions.map(definition => {
        const values:
          Record<string, string | number> = {};

        sources.forEach(source => {
          const statistics =
            source.data.numeric?.[
            variableName
            ] || {};

          if (
            definition.field === 'mean'
          ) {
            const mean =
              this.getNumericMean(
                statistics
              );

            values[source.key] =
              mean === null
                ? '-'
                : this.formatNumber(mean);

            return;
          }

          if (
            definition.field === 'missing'
          ) {
            const missingStatistics =
              this.getMissingStatistics(
                source.data,
                variableName,
                'Numeric'
              );

            values[source.key] =
              this.formatMissing(
                missingStatistics
              );

            return;
          }

          const rawValue =
            statistics[
            definition.field
            ];

          values[source.key] =
            this.formatNumericValue(
              rawValue
            );
        });

        return {
          label: definition.label,
          values,
          isSummary:
            definition.field === 'missing'
        };
      });

    return {
      firstColumnLabel,
      columns,
      rows
    };
  }

  private buildDateTable(
    variableName: string,
    sources: Array<{
      key: string;
      data: any;
    }>,
    columns: OverviewColumn[],
    firstColumnLabel: string
  ): OverviewTable {
    const definitions = [
      {
        label: 'N',
        field: 'count'
      },
      {
        label: 'Min',
        field: 'min'
      },
      {
        label: 'Max',
        field: 'max'
      },
      {
        label: 'Missing',
        field: 'missing'
      }
    ];

    const rows: OverviewRow[] =
      definitions.map(definition => {
        const values:
          Record<string, string | number> = {};

        sources.forEach(source => {
          const statistics =
            source.data.date?.[
            variableName
            ] || {};

          if (
            definition.field === 'missing'
          ) {
            const missingStatistics =
              this.getMissingStatistics(
                source.data,
                variableName,
                'Date'
              );

            values[source.key] =
              this.formatMissing(
                missingStatistics
              );

            return;
          }

          if (
            definition.field === 'count'
          ) {
            values[source.key] =
              this.formatNumericValue(
                statistics.count
              );

            return;
          }

          values[source.key] =
            this.formatYear(
              statistics[
              definition.field
              ]
            );
        });

        return {
          label: definition.label,
          values,
          isSummary:
            definition.field === 'missing'
        };
      });

    return {
      firstColumnLabel,
      columns,
      rows
    };
  }

  private buildCategoricalTable(
    variableName: string,
    datatype: VariableDatatype,
    sources: Array<{
      key: string;
      data: any;
    }>,
    columns: OverviewColumn[],
    firstColumnLabel: string
  ): OverviewTable {
    const categoryKeys = new Set<string>();

    sources.forEach(source => {
      const values =
        source.data
          .counts_unique_values?.[
        variableName
        ] || {};

      Object.keys(values).forEach(
        categoryKey => {
          if (
            !this.missingCategoryValues
              .has(categoryKey)
          ) {
            categoryKeys.add(categoryKey);
          }
        }
      );
    });

    const sortedCategoryKeys =
      Array.from(categoryKeys).sort(
        (left, right) => {
          return this.getCategoryLabel(
            variableName,
            left
          ).localeCompare(
            this.getCategoryLabel(
              variableName,
              right
            ),
            undefined,
            {
              sensitivity: 'base'
            }
          );
        }
      );

    const rows: OverviewRow[] =
      sortedCategoryKeys.map(
        categoryKey => {
          const values:
            Record<
              string,
              string | number
            > = {};

          sources.forEach(source => {
            const categoryValues =
              source.data
                .counts_unique_values?.[
              variableName
              ] || {};

            values[source.key] =
              this.toFiniteNumber(
                categoryValues[
                categoryKey
                ],
                0
              );
          });

          return {
            label: this.getCategoryLabel(variableName, categoryKey),
            values
          };
        }
      );

    const missingValues:
      Record<string, string | number> = {};

    const totalValues:
      Record<string, string | number> = {};

    sources.forEach(source => {
      const missingStatistics =
        this.getMissingStatistics(
          source.data,
          variableName,
          datatype
        );

      missingValues[source.key] =
        this.formatMissing(
          missingStatistics
        );

      totalValues[source.key] =
        missingStatistics.total;
    });

    rows.push({
      label: 'Missing',
      values: missingValues,
      isSummary: true
    });

    rows.push({
      label: 'Total',
      values: totalValues,
      isSummary: true
    });

    return {
      firstColumnLabel,
      columns,
      rows
    };
  }

  private buildChartGroups(
    variableName: string,
    datatype: VariableDatatype
  ): OverviewChartGroup[] {
    return Object.keys(this.summaryResult || {})
      .map(cohortKey => {
        const cohortData = this.summaryResult[cohortKey] || {};
        const centers = this.extractCenterData(cohortData);

        if (!centers.length) {
          return null;
        }

        return {
          cohortKey,
          cohortLabel: this.getCohortLabel(cohortKey),
          distributionChart: datatype === 'Numeric'
            ? this.buildBoxPlotChart(centers, variableName)
            : null,
          meanChart: datatype === 'Numeric'
            ? this.buildMeanChart(centers, variableName)
            : null,
          missingChart: this.buildMissingChart(centers, variableName, datatype)
        };
      })
      .filter((chartGroup): chartGroup is OverviewChartGroup => chartGroup !== null);
  }

  private buildBoxPlotChart(centers: any[], variableName: string): any | null {
    const chartData = centers
      .map(centerData => {
        const statistics = centerData.numeric?.[variableName] || {};
        const values = this.getValidBoxPlotValues(statistics);

        if (!values) {
          return null;
        }

        return {
          x: this.getCenterName(centerData.organization_id),
          y: values
        };
      })
      .filter((item): item is { x: string; y: number[] } => item !== null);

    if (!chartData.length) {
      return null;
    }

    return {
      series: [
        {
          name: 'Distribution',
          data: chartData
        }
      ],
      chart: {
        type: 'boxPlot',
        height: 340,
        toolbar: {
          show: true
        },
        animations: {
          enabled: false
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
        labels: {
          rotate: -30,
          trim: false
        },
        title: {
          text: 'Center'
        }
      },
      yaxis: {
        title: {
          text: this.formatLabel(variableName)
        },
        labels: {
          formatter: (value: number) => this.formatNumber(value)
        }
      },
      dataLabels: {
        enabled: false
      },
      colors: ['#255e87'],
      legend: {
        show: false
      },
      tooltip: {
        shared: false,
        intersect: true
      }
    };
  }

  private getValidBoxPlotValues(statistics: any): number[] | null {
    if (!statistics) {
      return null;
    }

    const values = [
      Number(statistics.min),
      Number(statistics.q_25),
      Number(statistics.median),
      Number(statistics.q_75),
      Number(statistics.max)
    ];

    const hasInvalidValue = values.some(value => !Number.isFinite(value));

    if (hasInvalidValue) {
      return null;
    }

    const [minimum, firstQuartile, median, thirdQuartile, maximum] = values;

    const hasCorrectOrder =
      minimum <= firstQuartile &&
      firstQuartile <= median &&
      median <= thirdQuartile &&
      thirdQuartile <= maximum;

    return hasCorrectOrder ? values : null;
  }

  private buildMeanChart(centers: any[], variableName: string): any | null {
    const labels: string[] = [];
    const values: number[] = [];

    centers.forEach(centerData => {
      const statistics = centerData.numeric?.[variableName] || {};
      const mean = this.getNumericMean(statistics);

      if (mean === null) {
        return;
      }

      labels.push(this.getCenterName(centerData.organization_id));
      values.push(Number(mean.toFixed(3)));
    });

    if (!values.length) {
      return null;
    }

    return {
      series: [
        {
          name: 'Mean',
          data: values
        }
      ],
      chart: {
        type: 'bar',
        height: Math.max(220, labels.length * 55),
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
        categories: labels,
        title: {
          text: this.formatLabel(variableName)
        },
        labels: {
          formatter: (value: number) => this.formatNumber(Number(value))
        }
      },
      dataLabels: {
        enabled: true,
        formatter: (value: number) => this.formatNumber(Number(value)),
        style: {
          colors: ['#ffffff']
        }
      },
      colors: ['#255e87'],
      legend: {
        show: false
      },
      tooltip: {
        y: {
          formatter: (value: number) => this.formatNumber(Number(value))
        }
      }
    };
  }

  private buildMissingChart(
    centers: any[],
    variableName: string,
    datatype: VariableDatatype
  ): any {
    const centerLabels =
      centers.map(centerData => {
        const total =
          this.getVariableTotal(
            centerData,
            variableName,
            datatype
          );

        const centerName =
          this.getCenterName(
            centerData.organization_id
          );

        return total > 0
          ? `${centerName} (n=${total})`
          : centerName;
      });

    const percentages =
      centers.map(centerData => {
        const statistics =
          this.getMissingStatistics(
            centerData,
            variableName,
            datatype
          );

        return Number(
          statistics.percentage.toFixed(1)
        );
      });

    return {
      series: [
        {
          name: 'Missing',
          data: percentages
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
        categories: centerLabels,
        min: 0,
        max: 100,
        tickAmount: 5,
        title: {
          text: 'Missing values (%)'
        },
        labels: {
          formatter: (
            value: number
          ) => `${Number(value).toFixed(0)}%`
        }
      },

      yaxis: {
        labels: {
          maxWidth: 200
        }
      },

      dataLabels: {
        enabled: true,
        formatter: (
          value: number
        ) => `${Number(value).toFixed(1)}%`,
        style: {
          colors: ['#ffffff']
        }
      },

      colors: ['#d97706'],

      legend: {
        show: false
      },

      tooltip: {
        y: {
          formatter: (
            value: number
          ) => `${Number(value).toFixed(1)}% missing`
        }
      }
    };
  }

  private getMissingStatistics(
    container: any,
    variableName: string,
    datatype: VariableDatatype
  ): MissingStatistics {
    let valid = 0;
    let missing = 0;

    if (datatype === 'Numeric') {
      const statistics =
        container.numeric?.[
        variableName
        ] || {};

      valid = this.toFiniteNumber(
        statistics.count,
        0
      );

      missing = this.toFiniteNumber(
        statistics.missing,
        0
      );
    } else if (datatype === 'Date') {
      const statistics =
        container.date?.[
        variableName
        ] || {};

      valid = this.toFiniteNumber(
        statistics.count,
        0
      );

      missing = this.toFiniteNumber(
        statistics.missing,
        0
      );
    } else {
      const values =
        container
          .counts_unique_values?.[
        variableName
        ] || {};

      const statistics =
        container.categorical?.[
        variableName
        ] ??
        container.categorical_count?.[
        variableName
        ] ??
        {};

      const validFromValues =
        Object.keys(values)
          .filter(
            key =>
              !this.missingCategoryValues
                .has(key)
          )
          .reduce(
            (sum, key) =>
              sum +
              this.toFiniteNumber(
                values[key],
                0
              ),
            0
          );

      const missingFromValues =
        Object.keys(values)
          .filter(key =>
            this.missingCategoryValues
              .has(key)
          )
          .reduce(
            (sum, key) =>
              sum +
              this.toFiniteNumber(
                values[key],
                0
              ),
            0
          );

      const explicitValid =
        this.toFiniteNumber(
          statistics.count,
          0
        );

      const explicitMissing =
        this.toFiniteNumber(
          statistics.missing,
          0
        );

      valid =
        explicitValid > 0
          ? explicitValid
          : validFromValues;

      missing =
        explicitMissing > 0
          ? explicitMissing
          : missingFromValues;
    }

    const numberOfRows =
      this.getNumberOfRows(container);

    const total =
      numberOfRows > 0
        ? numberOfRows
        : valid + missing;

    const percentage =
      total > 0
        ? (missing / total) * 100
        : 0;

    return {
      valid,
      missing,
      total,
      percentage
    };
  }

  private getVariableTotal(
    container: any,
    variableName: string,
    datatype: VariableDatatype
  ): number {
    return this.getMissingStatistics(
      container,
      variableName,
      datatype
    ).total;
  }

  private getNumberOfRows(
    container: any
  ): number {
    const rawNumberOfRows =
      container?.num_rows ??
      container?.num_rows_per_node;

    if (
      typeof rawNumberOfRows === 'number'
    ) {
      return rawNumberOfRows;
    }

    if (
      rawNumberOfRows &&
      typeof rawNumberOfRows === 'object'
    ) {
      const values =
        Object.values(rawNumberOfRows)
          .map(value => Number(value))
          .filter(value =>
            Number.isFinite(value)
          );

      if (values.length) {
        return values[0];
      }
    }

    return 0;
  }

  private extractCenterData(
    cohortData: any
  ): any[] {
    const centers: any[] = [];

    const visitPartials = (
      partials: any[]
    ): void => {
      (partials || []).forEach(
        partial => {
          const nestedPartials =
            Array.isArray(
              partial?.partials
            )
              ? partial.partials
              : [];

          if (nestedPartials.length) {
            visitPartials(
              nestedPartials
            );
            return;
          }

          if (
            partial &&
            partial.organization_id !==
            undefined
          ) {
            centers.push(partial);
          }
        }
      );
    };

    visitPartials(
      cohortData?.partials || []
    );

    return centers;
  }

  private getNumericMean(
    statistics: any
  ): number | null {
    if (!statistics) {
      return null;
    }

    if (
      statistics.mean !== undefined &&
      statistics.mean !== null
    ) {
      const explicitMean = Number(
        statistics.mean
      );

      if (
        Number.isFinite(explicitMean)
      ) {
        return explicitMean;
      }
    }

    const sum = Number(statistics.sum);
    const count = Number(
      statistics.count
    );

    if (
      Number.isFinite(sum) &&
      Number.isFinite(count) &&
      count > 0
    ) {
      return sum / count;
    }

    return null;
  }

  private hasBoxPlotStatistics(
    statistics: any
  ): boolean {
    if (!statistics) {
      return false;
    }

    return [
      statistics.min,
      statistics.q_25,
      statistics.median,
      statistics.q_75,
      statistics.max
    ].every(value => {
      return (
        value !== undefined &&
        value !== null &&
        value !== '' &&
        Number.isFinite(Number(value))
      );
    });
  }

  private getCohortLabel(
    vantage6CohortName: string
  ): string {
    const cohort =
      this.selectedCohorts.find(
        selectedCohort => {
          return (
            String(
              selectedCohort
                ?.vantage6_cohort_name || ''
            ) ===
            String(
              vantage6CohortName || ''
            )
          );
        }
      );

    return (
      cohort?.cohort_name ||
      this.formatLabel(
        vantage6CohortName
      )
    );
  }

  private getCenterName(
    organizationId: unknown
  ): string {
    const normalizedId =
      String(organizationId ?? '');

    return (
      this.organizationMap[
      normalizedId
      ] ||
      `ORG_${normalizedId}`
    );
  }

  private getCategoryLabel(
    variableName: string,
    categoryValue: string
  ): string {
    if (
      variableName === 'topography' &&
      categoryValue !== 'N/A'
    ) {
      const description =
        this.topographyMap[
        categoryValue
        ];

      return description
        ? `${description} (${categoryValue})`
        : categoryValue;
    }

    return this.formatLabel(
      categoryValue
    );
  }

  private formatMissing(
    statistics: MissingStatistics
  ): string {
    return (
      `${statistics.missing} ` +
      `(${statistics.percentage.toFixed(1)}%)`
    );
  }

  private formatNumericValue(
    value: unknown
  ): string | number {
    if (
      value === undefined ||
      value === null ||
      value === ''
    ) {
      return '-';
    }

    const numericValue = Number(value);

    if (!Number.isFinite(numericValue)) {
      return '-';
    }

    return Number(
      numericValue.toFixed(3)
    );
  }

  private formatYear(
    value: unknown
  ): string {
    if (
      value === undefined ||
      value === null ||
      value === ''
    ) {
      return '-';
    }

    if (
      typeof value === 'number' &&
      Number.isInteger(value) &&
      value >= 1000 &&
      value <= 9999
    ) {
      return String(value);
    }

    const normalizedValue =
      String(value).trim();

    const yearMatch =
      normalizedValue.match(
        /^(\d{4})/
      );

    return yearMatch
      ? yearMatch[1]
      : '-';
  }

  private formatNumber(
    value: number
  ): string {
    if (!Number.isFinite(value)) {
      return '-';
    }

    return value.toLocaleString(
      undefined,
      {
        maximumFractionDigits: 3
      }
    );
  }

  private toFiniteNumber(
    value: unknown,
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

  private normalizeVariableName(
    value: unknown
  ): string {
    return String(value || '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '_');
  }

  formatLabel(
    value: unknown
  ): string {
    if (!value) {
      return '';
    }

    const normalizedValue =
      String(value);

    if (normalizedValue === 'N/A') {
      return 'N/A';
    }

    return normalizedValue
      .replace(/_/g, ' ')
      .split(' ')
      .filter(Boolean)
      .map(part => {
        return (
          part.charAt(0).toUpperCase() +
          part.slice(1)
        );
      })
      .join(' ');
  }
}