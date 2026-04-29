import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { DataAnalysisService } from '../../data-analysis.service';
import { SelectionService } from '../selection.service';
import { ChartConfiguration, ChartData, ChartType } from 'chart.js';

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

interface KaplanMeierPoint {
    time: number;
    survival: number;
    atRisk: number;
    censored: number;
    observed: number;
    ciLower?: number;
    ciUpper?: number;
}

interface KaplanMeierCurve {
    cohortName: string;
    points: KaplanMeierPoint[];
}

interface KaplanMeierDisplayTable {
    cohortName: string;
    curves: KaplanMeierCurve[];
}

interface LogRankDisplayRow {
    cohort1: string;
    cohort2: string;
    pValue: string;
}

interface LogRankDisplayTable {
    cohortNames: string[];
    rows: LogRankDisplayRow[];
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

    currentView: 'empty' | 'crosstab' | 'ttest' | 'kaplan-meier' | 'log-rank' | 'placeholder' = 'empty';
    underConstructionMessage = 'Under construction';
    rawTaskResult: any = null;
    crosstabTables: CrosstabDisplayTable[] = [];
    tTestTables: TTestDisplayTable[] = [];
    kaplanMeierTables: KaplanMeierDisplayTable[] = [];
    logRankTables: LogRankDisplayTable[] = [];

    // Kaplan-Meier Chart
    kaplanMeierChartData: ChartData<'line'> = { labels: [], datasets: [] };
    kaplanMeierChartOptions: ChartConfiguration<'line'>['options'] = {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
            x: {
                type: 'linear',
                title: {
                    display: true,
                    text: 'Time'
                }
            },
            y: {
                min: -0.05,
                max: 1.05,
                title: {
                    display: true,
                    text: 'Survival S(t)'
                }
            }
        },
        plugins: {
            legend: {
                position: 'top',
                labels: {
                    font: {
                        size: 10
                    }
                }
            },
            title: {
                display: true,
                text: 'Results Kaplan Meier'
            }
        },
        elements: {
            point: {
                radius: 3,
                hoverRadius: 5
            },
            line: {
                borderWidth: 2,
                tension: 0
            }
        }
    };



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
        console.log("renderSelectedAlgorithm called with algorithm:", this.name_algorithm, "and data:", resultData);
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
        console.log("Rendering Kaplan-Meier with data:", resultData);
        this.kaplanMeierTables = this.buildKaplanMeierTables(resultData);
        console.log("Kaplan-Meier tables built:", this.kaplanMeierTables);

        if (this.kaplanMeierTables.length === 0) {
            this.setPlaceholderView(ALGORITHMS.KAPLAN_MEIER, 'No Kaplan-Meier data was returned for this analysis.');
            return;
        }

        // Build chart data
        this.buildKaplanMeierChart();

        this.currentView = 'kaplan-meier';
    }

    /*buildKaplanMeierChart(): void {
        const colors = [
            '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6',
            '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1'
        ];

        const datasets: ChartData<'line'>['datasets'] = [];
        const allTimes = new Set<number>();

        // Collect all unique time points
        this.kaplanMeierTables.forEach(table => {
            table.curves.forEach(curve => {
                const color = colors[colorIndex % colors.length];
                curve.points.forEach(point => allTimes.add(point.time));
            });
        });

        const sortedTimes = Array.from(allTimes).sort((a, b) => a - b);
        const labels = sortedTimes.map(t => t.toString());

        let colorIndex = 0;
        this.kaplanMeierTables.forEach(table => {
            table.curves.forEach(curve => {
                // Create step data for the curve (post step)
                const stepData: { x: number; y: number }[] = [];

                // Build step data: for each time point, the value stays constant until the next point
                curve.points.forEach((point, index) => {
                    stepData.push({ x: point.time, y: point.survival });
                    // Add intermediate step point for "post" step effect
                    if (index < curve.points.length - 1) {
                        stepData.push({ x: curve.points[index + 1].time, y: point.survival });
                    }
                });

                const data = sortedTimes.map(time => {
                    const point = curve.points.find(p => p.time === time);
                    return point ? point.survival : null;
                });

                datasets.push({
                    label: this.formatLabel(curve.cohortName),
                    data: data,
                    borderColor: colors[colorIndex % colors.length],
                    backgroundColor: colors[colorIndex % colors.length] + '33',
                    fill: false,
                    stepped: 'after' as const,
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    tension: 0
                });

                colorIndex++;
            });
        });

        this.kaplanMeierChartData = {
            labels: labels,
            datasets: datasets
        };

        // Update chart options with title
        this.kaplanMeierChartOptions = {
            ...this.kaplanMeierChartOptions,
            plugins: {
                ...this.kaplanMeierChartOptions?.plugins,
                title: {
                    display: true,
                    text: 'Kaplan-Meier Survival Curves'
                }
            }
        };
    }*/

    buildKaplanMeierChart(): void {
        const colors = [
            '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6',
            '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1'
        ];

        const datasets: any[] = [];
        let colorIndex = 0;
        console.log("kaplanMeierTables ", this.kaplanMeierTables);

        this.kaplanMeierTables.forEach(table => {
            table.curves.forEach(curve => {

                const color = colors[colorIndex % colors.length];

                const survivalData = curve.points.map(p => ({
                    x: p.time,
                    y: p.survival
                }));

                datasets.push({
                    label: this.formatLabel(curve.cohortName),
                    data: survivalData,
                    borderColor: color,
                    backgroundColor: color,
                    stepped: 'after',
                    fill: false,
                    tension: 0,
                    pointRadius: 0
                });

                // ✅ CI (si existe)
                const hasCI = curve.points.some(p => p.ciLower !== undefined);

                if (hasCI) {
                    const upper = curve.points.map(p => ({
                        x: p.time,
                        y: p.ciUpper ?? null
                    }));

                    const lower = curve.points.map(p => ({
                        x: p.time,
                        y: p.ciLower ?? null
                    }));

                    // Upper line (invisible)
                    datasets.push({
                        label: `${curve.cohortName} CI Upper`,
                        data: upper,
                        borderColor: 'transparent',
                        pointRadius: 0,
                        stepped: 'after',
                        fill: false
                    });

                    // Lower line (fills to previous dataset)
                    datasets.push({
                        label: `${curve.cohortName} CI`,
                        data: lower,
                        borderColor: 'transparent',
                        backgroundColor: color + '33',
                        stepped: 'after',
                        fill: '-1', // 🔥 clave: rellena entre upper y lower
                        pointRadius: 0
                    });
                }

                colorIndex++;
            });
        });

        this.kaplanMeierChartData = {
            datasets
        };
    }

    renderLogRankTest(resultData: any): void {
        console.log("Rendering Log-Rank with data:", resultData);
        this.logRankTables = this.buildLogRankTables(resultData);
        console.log("Log-Rank tables built:", this.logRankTables);

        if (this.logRankTables.length === 0) {
            this.setPlaceholderView(ALGORITHMS.LOG_RANK_TEST, 'No Log-Rank data was returned for this analysis.');
            return;
        }

        this.currentView = 'log-rank';
    }

    buildKaplanMeierTables(resultData: any): KaplanMeierDisplayTable[] {
        const kaplanMeierData = resultData?.kaplan_meier;

        if (!kaplanMeierData || typeof kaplanMeierData !== 'object') {
            return [];
        }

        const curves: KaplanMeierCurve[] = [];

        // 🔥 IMPORTANTE: iteras cohortes → generas curvas (NO tablas)
        Object.entries(kaplanMeierData).forEach(([cohortName, cohortData]: [string, any]) => {

            const indexKeys = Object.keys(cohortData.year_of_birth || {})
                .sort((a, b) => Number(a) - Number(b));

            const points: KaplanMeierPoint[] = indexKeys.map(key => {

                const lowerVal = cohortData.ci_lower?.[key];
                const upperVal = cohortData.ci_upper?.[key];

                return {
                    time: Number(cohortData.year_of_birth?.[key] ?? 0),
                    survival: Number(cohortData.survival_cdf?.[key] ?? 1),
                    atRisk: Number(cohortData.at_risk?.[key] ?? 0),
                    censored: Number(cohortData.censored?.[key] ?? 0),
                    observed: Number(cohortData.observed?.[key] ?? 0),
                    ciLower: lowerVal != null ? Number(lowerVal) : undefined,
                    ciUpper: upperVal != null ? Number(upperVal) : undefined
                };
            });

            curves.push({
                cohortName,
                points
            });
        });

        // ✅ SOLO UNA TABLE
        return [{
            cohortName: 'Kaplan-Meier',
            curves
        }];
    }

    /*buildKaplanMeierTables(resultData: any): KaplanMeierDisplayTable[] {
        console.log("buildKaplanMeierTables called with:", resultData);
        const tables: KaplanMeierDisplayTable[] = [];
        const kaplanMeierData = resultData?.kaplan_meier;
        console.log("kaplan_meier key exists:", kaplanMeierData);

        if (!kaplanMeierData || typeof kaplanMeierData !== 'object') {
            console.log("No kaplan_meier data found or not an object");
            return tables;
        }

        // Each key in kaplan_meier is a cohort name (e.g., "bold_knuth_sex=FEMALE")
        Object.entries(kaplanMeierData).forEach(([cohortName, cohortData]: [string, any]) => {
            if (!cohortData || typeof cohortData !== 'object') {
                return;
            }

            const curves: KaplanMeierCurve[] = [];

            // cohortData contains the data columns as objects with string keys ("0", "1", "2", ...)
            // Convert to array format for rendering
            const times: number[] = [];
            const survival: number[] = [];
            const atRisk: number[] = [];
            const censored: number[] = [];
            const observed: number[] = [];
            const ciLower: (number | undefined)[] = [];
            const ciUpper: (number | undefined)[] = [];

            // Get all index keys and sort numerically
            const indexKeys = Object.keys(cohortData.year_of_birth || {}).sort((a, b) => Number(a) - Number(b));

            for (const key of indexKeys) {
                times.push(Number(cohortData.year_of_birth?.[key] || 0));
                survival.push(Number(cohortData.survival_cdf?.[key] ?? 1));
                atRisk.push(Number(cohortData.at_risk?.[key] ?? 0));
                censored.push(Number(cohortData.censored?.[key] ?? 0));
                observed.push(Number(cohortData.observed?.[key] ?? 0));

                const lowerVal = cohortData.ci_lower?.[key];
                ciLower.push(lowerVal !== null && lowerVal !== undefined ? Number(lowerVal) : undefined);

                const upperVal = cohortData.ci_upper?.[key];
                ciUpper.push(upperVal !== null && upperVal !== undefined ? Number(upperVal) : undefined);
            }

            const points: KaplanMeierPoint[] = times.map((time, index) => ({
                time,
                survival: survival[index] !== undefined ? survival[index] : 1,
                atRisk: atRisk[index] !== undefined ? atRisk[index] : 0,
                censored: censored[index] !== undefined ? censored[index] : 0,
                observed: observed[index] !== undefined ? observed[index] : 0,
                ciLower: ciLower[index],
                ciUpper: ciUpper[index]
            }));

            curves.push({
                cohortName: cohortName,
                points: points
            });

            if (curves.length > 0) {
                tables.push({
                    cohortName: cohortName,
                    curves: curves
                });
            }
        });

        console.log("Final kaplan tables:", tables);
        return tables;
    }*/

    buildLogRankTables(resultData: any): LogRankDisplayTable[] {
        console.log("buildLogRankTables called with:", resultData);
        const tables: LogRankDisplayTable[] = [];
        const logRankData = resultData?.log_rank;
        console.log("log_rank key exists:", logRankData);

        if (!logRankData || typeof logRankData !== 'object') {
            console.log("No log_rank data found or not an object");
            return tables;
        }

        const cohortNames = Object.keys(logRankData);
        const rows: LogRankDisplayRow[] = [];

        // log_rank is a matrix where each cell contains the p-value between two cohorts
        cohortNames.forEach(cohort1 => {
            const cohort1Data = logRankData[cohort1];
            if (!cohort1Data || typeof cohort1Data !== 'object') {
                return;
            }

            cohortNames.forEach(cohort2 => {
                if (cohort1 === cohort2) {
                    return;
                }

                const pValue = cohort1Data[cohort2];
                if (pValue !== undefined && pValue !== null) {
                    rows.push({
                        cohort1,
                        cohort2,
                        pValue: this.formatNumber(pValue)
                    });
                }
            });
        });

        if (rows.length > 0) {
            tables.push({
                cohortNames,
                rows
            });
        }

        console.log("Final log rank tables:", tables);
        return tables;
    }

    formatNumber(value: unknown): string {
        if (value === null || value === undefined) {
            return '';
        }

        if (typeof value === 'number') {
            if (Number.isFinite(value)) {
                return value.toExponential(3);
            }
            return String(value);
        }

        const numericValue = Number(value);
        if (!Number.isNaN(numericValue)) {
            return numericValue.toExponential(3);
        }

        return String(value);
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
        this.kaplanMeierTables = [];
        this.logRankTables = [];
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