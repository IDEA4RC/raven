import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { DataAnalysisService } from '../../data-analysis.service';
import { SelectionService } from '../selection.service';

const ALGORITHMS = {
    CROSSTABULATION: 'crosstabulation',
    TTEST: 't-test',
    CHI_SQUARED: 'chi-squared',
    KAPLAN_MEIER: 'kaplan-meier',
    LOG_RANK_TEST: 'log-rank-test',
    GLM: 'glm',
    TIME_DELTA: 'time-delta',
    TABLE1: 'table1',
    BASIC_ARITHMETIC: 'basic_arithmetic',
    SUMMARY: 'summary'
} as const;

type AlgorithmMethod = typeof ALGORITHMS[keyof typeof ALGORITHMS];

interface SelectedAlgorithm {
    id?: number;
    method_name?: string;
    description?: string;
    input?: unknown;
    col_var?: string;
    row_var_list?: string;
    task_id?: number;
    creation_date?: string;
    version_date?: string;
    status_task?: string;
    cohort_ids?: number[];
}

interface CrosstabDisplayRow {
    rowValues: Record<string, string>;
    valueValues: Record<string, string>;
    isTotalRow: boolean;
}

interface CrosstabDisplayTable {
    cohortName: string;
    rowHeaders: string[];
    valueHeaders: string[];
    columnVariable: string;
    rows: CrosstabDisplayRow[];
    chi2?: string | number;
    pValue?: string | number;
}

interface TTestDisplayRow {
    variableName: string;
    metrics: Record<string, string>;
}

interface TTestDisplayTable {
    cohortName: string;
    metricHeaders: string[];
    rows: TTestDisplayRow[];
}

interface ExecutionInfoRow {
    id: string;
    name: string;
    status: string;
    org: string;
    user: string;
    created: string;
}

@Component({
    selector: 'app-analysis-results',
    templateUrl: './analysis-results.component.html',
    styleUrl: './analysis-results.component.scss'
})
export class AnalysisResultsComponent implements OnInit {
    algorithms = ALGORITHMS;

    selectedAlgorithm: SelectedAlgorithm | null = null;
    name_algorithm = '';
    cohorts_string = 'Pending result';
    list_variables_text = '';
    row_variables_text = '';
    column_variable_text = '';

    currentView: 'empty' | 'crosstab' | 'ttest' | 'placeholder' = 'empty';
    underConstructionMessage = 'Under construction';
    rawTaskResult: any = null;
    crosstabTables: CrosstabDisplayTable[] = [];
    tTestTables: TTestDisplayTable[] = [];

    displayedColumns = ['id', 'name', 'status', 'org', 'user', 'created'];
    data: ExecutionInfoRow[] = [
        { id: '-', name: '-', status: '-', org: '-', user: '-', created: '-' }
    ];

    subtasks = [
        { name: 'INT', status: 'Completed' },
        { name: 'ISS-FJF', status: 'Completed' },
        { name: 'APHP', status: 'Completed' }
    ];

    @Output() previousStep = new EventEmitter<void>();

    constructor(
        private dataAnalysisService: DataAnalysisService,
        public selectionService: SelectionService
    ) { }

    ngOnInit(): void {
        this.selectionService.selectedItems$.subscribe(items => {
            if (!items || items.length === 0) {
                this.currentView = 'empty';
                this.underConstructionMessage = 'No algorithm selected.';
                return;
            }

            this.selectedAlgorithm = items[0] as SelectedAlgorithm;
            this.initializeSelectedAlgorithm(this.selectedAlgorithm);

            if (this.selectedAlgorithm.task_id) {
                this.fetchTaskResult(this.selectedAlgorithm.task_id);
                return;
            }

            this.setPlaceholderView(this.selectedAlgorithm.method_name, 'This algorithm does not have a task result yet.');
        });
    }

    initializeSelectedAlgorithm(selectedAlgorithm: SelectedAlgorithm): void {
        this.name_algorithm = selectedAlgorithm.method_name || '';

        const rowVariables = this.parseRowVariables(selectedAlgorithm);
        this.row_variables_text = rowVariables.map(variable => this.formatLabel(variable)).join(', ');
        this.list_variables_text = this.row_variables_text;
        this.column_variable_text = this.formatLabel(selectedAlgorithm.col_var || '');

        if (Array.isArray(selectedAlgorithm.cohort_ids) && selectedAlgorithm.cohort_ids.length > 0) {
            this.cohorts_string = selectedAlgorithm.cohort_ids.join(', ');
        }

        this.data = [
            {
                id: String(selectedAlgorithm.id ?? '-'),
                name: this.formatLabel(selectedAlgorithm.method_name || '-'),
                status: selectedAlgorithm.status_task || '-',
                org: '-',
                user: '-',
                created: this.formatDate(selectedAlgorithm.creation_date)
            }
        ];
    }

    fetchTaskResult(taskId: number): void {
        this.dataAnalysisService.getTaskResult(taskId).subscribe({
            next: (result) => {
                this.rawTaskResult = result?.result ?? result ?? {};
                console.log("Raw task results", this.rawTaskResult);
                
                const cohortNames = Object.keys(this.rawTaskResult || {});
                if (cohortNames.length > 0) {
                    this.cohorts_string = cohortNames.map(cohort => this.formatLabel(cohort)).join('; ');
                }

                this.renderSelectedAlgorithm(this.rawTaskResult);
            },
            error: (err) => {
                console.error('Error obteniendo el resultado de la tarea:', err);
                this.setPlaceholderView(this.name_algorithm, 'Result could not be loaded.');
            }
        });
    }

    renderSelectedAlgorithm(resultData: any): void {
        switch (this.name_algorithm as AlgorithmMethod) {
            case ALGORITHMS.CROSSTABULATION:
                this.renderCrosstabulation(resultData);
                break;
            case ALGORITHMS.TTEST:
                this.renderTTest(resultData);
                break;
            case ALGORITHMS.CHI_SQUARED:
                this.renderChiSquared(resultData);
                break;
            case ALGORITHMS.KAPLAN_MEIER:
                this.renderKaplanMeier(resultData);
                break;
            case ALGORITHMS.LOG_RANK_TEST:
                this.renderLogRankTest(resultData);
                break;
            case ALGORITHMS.GLM:
                this.renderGlm(resultData);
                break;
            case ALGORITHMS.TIME_DELTA:
                this.renderTimeDelta(resultData);
                break;
            case ALGORITHMS.TABLE1:
                this.renderTable1(resultData);
                break;
            case ALGORITHMS.BASIC_ARITHMETIC:
                this.renderBasicArithmetic(resultData);
                break;
            case ALGORITHMS.SUMMARY:
                this.renderSummary(resultData);
                break;
            default:
                this.setPlaceholderView(this.name_algorithm, 'This algorithm renderer is not implemented yet.');
                break;
        }
    }

    renderCrosstabulation(resultData: any): void {
        this.crosstabTables = this.buildCrosstabTables(resultData);

        if (this.crosstabTables.length === 0) {
            this.setPlaceholderView(ALGORITHMS.CROSSTABULATION, 'No contingency table data was returned for this crosstabulation.');
            return;
        }

        this.currentView = 'crosstab';
    }

    renderTTest(resultData: any): void {
        this.tTestTables = this.buildTTestTables(resultData);

        if (this.tTestTables.length === 0) {
            this.setPlaceholderView(ALGORITHMS.TTEST, 'No t-test data was returned for this analysis.');
            return;
        }

        this.currentView = 'ttest';
    }

    renderChiSquared(resultData: any): void {
        void resultData;
        this.setPlaceholderView(ALGORITHMS.CHI_SQUARED);
    }

    renderKaplanMeier(resultData: any): void {
        void resultData;
        this.setPlaceholderView(ALGORITHMS.KAPLAN_MEIER);
    }

    renderLogRankTest(resultData: any): void {
        void resultData;
        this.setPlaceholderView(ALGORITHMS.LOG_RANK_TEST);
    }

    renderGlm(resultData: any): void {
        void resultData;
        this.setPlaceholderView(ALGORITHMS.GLM);
    }

    renderTimeDelta(resultData: any): void {
        void resultData;
        this.setPlaceholderView(ALGORITHMS.TIME_DELTA);
    }

    renderTable1(resultData: any): void {
        void resultData;
        this.setPlaceholderView(ALGORITHMS.TABLE1);
    }

    renderBasicArithmetic(resultData: any): void {
        void resultData;
        this.setPlaceholderView(ALGORITHMS.BASIC_ARITHMETIC);
    }

    renderSummary(resultData: any): void {
        void resultData;
        this.setPlaceholderView(ALGORITHMS.SUMMARY);
    }

    setPlaceholderView(methodName?: string, message?: string): void {
        this.currentView = 'placeholder';
        this.crosstabTables = [];
        this.tTestTables = [];
        const algorithmLabel = this.formatLabel(methodName || 'This algorithm');
        this.underConstructionMessage = message || `${algorithmLabel} is under construction.`;
    }

    buildTTestTables(resultData: any): TTestDisplayTable[] {
        const resultEntries = Object.entries(resultData || {});
        const tables: TTestDisplayTable[] = [];

        resultEntries.forEach(([cohortName, cohortData]: [string, any]) => {
            if (!cohortData || typeof cohortData !== 'object' || Array.isArray(cohortData)) {
                return;
            }

            const variableEntries = Object.entries(cohortData).filter(([, metrics]) => {
                return metrics && typeof metrics === 'object' && !Array.isArray(metrics);
            }) as Array<[string, Record<string, unknown>]>;

            if (variableEntries.length === 0) {
                return;
            }

            const metricHeaders = this.getTTestMetricHeaders(variableEntries);
            const rows = variableEntries
                .map(([variableName, metrics]) => ({
                    variableName,
                    metrics: metricHeaders.reduce((acc, metricName) => {
                        acc[metricName] = this.formatTTestMetric(metrics[metricName]);
                        return acc;
                    }, {} as Record<string, string>)
                }))
                .sort((left, right) => left.variableName.localeCompare(right.variableName));

            tables.push({
                cohortName,
                metricHeaders,
                rows
            });
        });

        return tables;
    }

    getTTestMetricHeaders(variableEntries: Array<[string, Record<string, unknown>]>): string[] {
        const metricSet = new Set<string>();

        variableEntries.forEach(([, metrics]) => {
            Object.keys(metrics).forEach(metric => metricSet.add(metric));
        });

        const headers = Array.from(metricSet);
        const orderedHeaders: string[] = [];

        ['p_value', 't_score'].forEach(preferred => {
            if (headers.includes(preferred)) {
                orderedHeaders.push(preferred);
            }
        });

        headers
            .filter(header => !orderedHeaders.includes(header))
            .sort((left, right) => left.localeCompare(right))
            .forEach(header => orderedHeaders.push(header));

        return orderedHeaders;
    }

    formatTTestMetric(value: unknown): string {
        if (value === null || value === undefined || value === '') {
            return '';
        }

        if (typeof value === 'number' && Number.isFinite(value)) {
            return Number(value.toFixed(3)).toString();
        }

        if (typeof value === 'string') {
            const numericValue = Number(value);
            if (!Number.isNaN(numericValue) && value.trim() !== '') {
                return Number(numericValue.toFixed(3)).toString();
            }
        }

        return String(value);
    }

    buildCrosstabTables(resultData: any): CrosstabDisplayTable[] {
        const rowHeaders = this.parseRowVariables(this.selectedAlgorithm);
        console.log("rowHeaders:", rowHeaders);

        const resultEntries = Object.entries(resultData || {});
        console.log("resultEntries:", resultEntries);

        const tables: CrosstabDisplayTable[] = [];

        resultEntries.forEach(([cohortName, cohortData]: [string, any]) => {
            console.log("cohortName:", cohortName);
            console.log("cohortData:", cohortData);

            const contingencyTable = Array.isArray(cohortData?.contingency_table) ? cohortData.contingency_table : [];
            if (contingencyTable.length === 0) {
                return;
            }
            console.log("contingencyTable:", contingencyTable);

            const resolvedRowHeaders = rowHeaders.length > 0 ? rowHeaders : this.detectRowHeaders(contingencyTable);
            const valueHeaders = this.getOrderedValueColumns(contingencyTable, resolvedRowHeaders);
            const columnVariable = cohortData?.col_var || this.selectedAlgorithm?.col_var || '';
            console.log("resolvedRowHeaders:", resolvedRowHeaders);
            console.log("valueHeaders:", valueHeaders);
            console.log("columnVariable:", columnVariable);
            tables.push({
                cohortName,
                rowHeaders: resolvedRowHeaders,
                valueHeaders,
                columnVariable,
                rows: contingencyTable.map((row: Record<string, unknown>) => this.buildCrosstabRow(row, resolvedRowHeaders, valueHeaders)),
                chi2: cohortData?.chi2?.chi2,
                pValue: cohortData?.chi2?.['P-value']
            });
        });

        return tables;
    }

    buildCrosstabRow(row: Record<string, unknown>, rowHeaders: string[], valueHeaders: string[]): CrosstabDisplayRow {
        const rowValues = rowHeaders.reduce((acc, header) => {
            acc[header] = this.toDisplayValue(row[header]);
            return acc;
        }, {} as Record<string, string>);

        const valueValues = valueHeaders.reduce((acc, header) => {
            acc[header] = this.toDisplayValue(row[header]);
            return acc;
        }, {} as Record<string, string>);

        const isTotalRow = rowHeaders.some(header => this.toDisplayValue(row[header]).toLowerCase() === 'total');

        return {
            rowValues,
            valueValues,
            isTotalRow
        };
    }

    parseRowVariables(selectedAlgorithm: SelectedAlgorithm | null): string[] {
        if (!selectedAlgorithm) {
            return [];
        }

        if (selectedAlgorithm.row_var_list) {
            return selectedAlgorithm.row_var_list
                .split(',')
                .map(variable => variable.trim())
                .filter(variable => variable.length > 0);
        }

        return this.parseInputVariables(selectedAlgorithm.input);
    }

    parseInputVariables(input: unknown): string[] {
        if (Array.isArray(input)) {
            return input.map(value => String(value).trim()).filter(value => value.length > 0);
        }

        if (typeof input !== 'string') {
            return [];
        }

        try {
            const parsedInput = JSON.parse(input);
            if (Array.isArray(parsedInput)) {
                return parsedInput.map(value => String(value).trim()).filter(value => value.length > 0);
            }

            if (parsedInput?.variablesList && Array.isArray(parsedInput.variablesList)) {
                return parsedInput.variablesList.map((value: unknown) => String(value).trim()).filter((value: string) => value.length > 0);
            }
        } catch (error) {
            void error;
        }

        return input
            .split(',')
            .map(value => value.trim())
            .filter(value => value.length > 0);
    }

    detectRowHeaders(contingencyTable: Array<Record<string, unknown>>): string[] {
        if (!contingencyTable.length) {
            return [];
        }

        return Object.keys(contingencyTable[0]).filter(column => {
            const values = contingencyTable.map(row => this.toDisplayValue(row[column]).trim());
            const numericLikeRatio = values.filter(value => /^-?\d+(\.\d+)?$/.test(value)).length / values.length;
            return numericLikeRatio <= 0.5;
        });
    }

    getOrderedValueColumns(contingencyTable: Array<Record<string, unknown>>, rowHeaders: string[]): string[] {
        const rowHeaderSet = new Set(rowHeaders);
        const valueColumns = new Set<string>();

        contingencyTable.forEach(row => {
            Object.keys(row).forEach(column => {
                if (!rowHeaderSet.has(column)) {
                    valueColumns.add(column);
                }
            });
        });

        const columns = Array.from(valueColumns);
        const regularColumns = columns
            .filter(column => column !== 'N/A' && column !== 'Total')
            .sort((left, right) => left.localeCompare(right));

        if (columns.includes('N/A')) {
            regularColumns.push('N/A');
        }

        if (columns.includes('Total')) {
            regularColumns.push('Total');
        }

        return regularColumns;
    }

    formatLabel(value: string): string {
        if (!value) {
            return '';
        }

        if (value === 'N/A') {
            return 'N/A';
        }

        return value
            .replace(/_/g, ' ')
            .split(' ')
            .filter(part => part.length > 0)
            .map(part => part.charAt(0).toUpperCase() + part.slice(1))
            .join(' ');
    }

    formatDate(value?: string): string {
        if (!value) {
            return '-';
        }

        const date = new Date(value);
        if (Number.isNaN(date.getTime())) {
            return value;
        }

        return date.toLocaleDateString('es-ES');
    }

    toDisplayValue(value: unknown): string {
        if (value === null || value === undefined || value === '') {
            return '';
        }

        return String(value);
    }

    goBack(): void {
        this.previousStep.emit();
    }

    /*
     * V1 reference intentionally kept in history:
     * the previous version rendered a fixed contingency table shape directly from dataTables.
     * This component now dispatches by method_name and builds the crosstab structure dynamically.
     */
}