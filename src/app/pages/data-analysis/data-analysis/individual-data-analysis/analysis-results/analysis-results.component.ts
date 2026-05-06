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
    matrix: (number | null)[][];
    rows: LogRankDisplayRow[];
}

interface GlmCoefficient {
    predictor: string;
    beta: number;
    stdError: number;
    zValue: number;
    pValue: number;
}

interface GlmCohortModel {
    cohortName: string;
    coefficients: GlmCoefficient[];
    details: {
        converged: boolean;
        dispersion: number;
        isDispersionEstimated: boolean;
        numObservations: number;
        numVariables: number;
        nullDeviance: number;
        deviance: number;
    };
}

interface GlmDisplayTable {
    cohorts: GlmCohortModel[];
    globalDetails: {
        iterations: number;
        allConverged: boolean;
    };
}

interface ExecutionInfoRow {
    id: string;
    name: string;
    status: string;
    org: string;
    user: string;
    created: string;
}

interface TaskStatistics {
    id?: number;
    status?: string;
    finishedAt?: string;
    createdAt?: string;
    initOrg?: { id?: number; link?: string };
    initUser?: { id?: number; link?: string };
    name?: string;
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

    currentView: 'empty' | 'crosstab' | 'ttest' | 'kaplan-meier' | 'log-rank' | 'glm' | 'placeholder' = 'empty';
    underConstructionMessage = 'Under construction';
    rawTaskResult: any = null;
    crosstabTables: CrosstabDisplayTable[] = [];
    tTestTables: TTestDisplayTable[] = [];
    kaplanMeierTables: KaplanMeierDisplayTable[] = [];
    logRankTables: LogRankDisplayTable[] = [];
    glmTable: GlmDisplayTable | null = null;

    // GLM Charts
    glmCoefficientChartData: ChartData<'bar'> = { labels: [], datasets: [] };
    glmCoefficientChartOptions: ChartConfiguration<'bar'>['options'] = {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
            x: {
                title: {
                    display: true,
                    text: 'Effect size (β)'
                }
            },
            y: {
                title: {
                    display: true,
                    text: 'Predictor'
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
            }
        }
    };

    glmDevianceChartData: ChartData<'bar'> = { labels: [], datasets: [] };
    glmDevianceChartOptions: ChartConfiguration<'bar'>['options'] = {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
            y: {
                title: {
                    display: true,
                    text: 'Deviance'
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
            }
        }
    };

    knownKeysKaplan = [
        'at_risk',
        'censored',
        'ci_lower',
        'ci_upper',
        'cohort',
        'hazard',
        'observed',
        'removed',
        'survival_cdf'
    ];

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
                onClick: (e, legendItem, legend) => {
                    const chart = legend.chart;


                    chart.update();
                },
                position: 'top',
                labels: {

                    filter: function (legendItem, chartData) {
                        const datasetIndex = legendItem.datasetIndex;

                        if (datasetIndex === undefined) {
                            return false;
                        }

                        const dataset = chartData.datasets[datasetIndex];

                        return !!dataset?.label;
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

    taskStatistics: TaskStatistics | null = null;
    executionDuration = '-';

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
                this.getTaskStatistics(this.selectedAlgorithm.task_id);
                return;
            }

            this.setPlaceholderView(this.selectedAlgorithm.method_name, 'This algorithm does not have a task result yet.');
        });
    }

    initializeSelectedAlgorithm(selectedAlgorithm: SelectedAlgorithm): void {
        console.log("Selected algorithm:", selectedAlgorithm);
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

    getTaskStatistics(taskId: number): void {
        this.dataAnalysisService.getTaskStatistics(taskId).subscribe({
            next: (stats) => {
                this.taskStatistics = {
                    id: stats?.id,
                    status: stats?.status,
                    finishedAt: stats?.finished_at,
                    createdAt: stats?.created_at,
                    initOrg: stats?.init_org,
                    initUser: stats?.init_user,
                    name: stats?.name
                };
                this.executionDuration = this.formatExecutionDuration(stats?.created_at, stats?.finished_at);
                this.data = [
                    {
                        id: String(stats?.id ?? this.selectedAlgorithm?.id ?? '-'),
                        name: this.formatLabel(stats?.name ?? (this.selectedAlgorithm?.method_name || '-')),
                        status: stats?.status ?? (this.selectedAlgorithm?.status_task || '-'),
                        org: this.formatOrg(stats?.init_org),
                        user: this.formatUser(stats?.init_user),
                        created: this.formatDate(stats?.created_at)
                    }
                ];
            },
            error: (err) => {
                console.error('Error obteniendo las estadísticas de la tarea:', err);
            }
        });
    }

    private formatExecutionDuration(createdAt?: string, finishedAt?: string): string {
        if (!createdAt || !finishedAt) {
            return '-';
        }

        const start = Date.parse(createdAt);
        const end = Date.parse(finishedAt);
        if (Number.isNaN(start) || Number.isNaN(end) || end < start) {
            return '-';
        }

        let diff = Math.floor((end - start) / 1000);
        const hours = Math.floor(diff / 3600);
        diff -= hours * 3600;
        const minutes = Math.floor(diff / 60);
        const seconds = diff - minutes * 60;

        const parts: string[] = [];
        if (hours) {
            parts.push(`${hours}h`);
        }
        if (minutes) {
            parts.push(`${minutes}m`);
        }
        if (seconds || parts.length === 0) {
            parts.push(`${seconds}s`);
        }

        return parts.join(' ');
    }

    private formatOrg(initOrg: { id?: number; link?: string } | undefined): string {
        if (!initOrg || initOrg.id === undefined || initOrg.id === null) {
            return '-';
        }
        return `Org ${initOrg.id}`;
    }

    private formatUser(initUser: { id?: number; link?: string } | undefined): string {
        if (!initUser || initUser.id === undefined || initUser.id === null) {
            return '-';
        }
        return `User ${initUser.id}`;
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
        this.kaplanMeierTables = this.buildKaplanMeierTables(resultData);
        this.logRankTables = this.buildLogRankTables(resultData);

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
                    pointRadius: 0,
                    borderWidth: 2,
                    order: 2
                });

                const hasCI = curve.points.some(p => p.ciLower !== undefined && p.ciUpper !== undefined);

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
                        data: upper,
                        borderColor: 'transparent',
                        backgroundColor: 'transparent',
                        pointRadius: 0,
                        stepped: 'after',
                        fill: false,
                        borderWidth: 0,
                        order: 1,
                        label: undefined
                    });

                    // Lower line (fills to previous dataset)
                    datasets.push({
                        data: lower,
                        borderColor: 'transparent',
                        backgroundColor: color + '33',
                        stepped: 'after',
                        fill: '-1', // 🔥 clave: rellena entre upper y lower
                        pointRadius: 0,
                        order: 1,
                        label: undefined
                    });
                }

                colorIndex++;
            });
        });

        this.kaplanMeierChartData = {
            datasets
        };
    }




    buildKaplanMeierTables(resultData: any): KaplanMeierDisplayTable[] {
        const kaplanMeierData = resultData?.kaplan_meier;

        if (!kaplanMeierData || typeof kaplanMeierData !== 'object') {
            return [];
        }

        const curves: KaplanMeierCurve[] = [];

        Object.entries(kaplanMeierData).forEach(([cohortName, cohortData]: [string, any]) => {
            const timeKey = Object.keys(cohortData).find(
                key => !this.knownKeysKaplan.includes(key)
            );

            if (!timeKey) {
                console.warn('No time variable found in cohortData', cohortData);
                return;
            }

            const indexKeys = Object.keys(cohortData[timeKey] || {})
                .sort((a, b) => Number(a) - Number(b));

            const points: KaplanMeierPoint[] = indexKeys.map(key => {

                const lowerVal = cohortData.ci_lower?.[key];
                const upperVal = cohortData.ci_upper?.[key];

                return {
                    time: Number(cohortData[timeKey]?.[key] ?? 0),
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
        const logRankData = resultData?.log_rank;

        if (!logRankData || typeof logRankData !== 'object') {
            return [];
        }

        const cohortNames = Object.keys(logRankData).sort();

        const matrix: (number | null)[][] = cohortNames.map(row =>
            cohortNames.map(col => logRankData[row]?.[col] ?? null)
        );

        const rows: LogRankDisplayRow[] = [];

        for (let i = 0; i < cohortNames.length; i++) {
            for (let j = 0; j < cohortNames.length; j++) {
                if (i !== j) {
                    rows.push({
                        cohort1: cohortNames[i],
                        cohort2: cohortNames[j],
                        pValue: matrix[i][j] != null ? String(matrix[i][j]) : '-'
                    });
                }
            }
        }

        return [{
            cohortNames,
            matrix,
            rows
        }];
    }

    getPValueColor(value: number | null): string {
        if (value === null) return 'transparent';

        // invertimos: p pequeño = rojo fuerte
        const intensity = 1 - value;

        const r = 255;
        const g = Math.floor(140 * (1 - intensity));
        const b = 0;

        return `rgba(${r}, ${g}, ${b}, ${0.15 + intensity * 0.85})`;
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
        console.log("Rendering GLM with data:", resultData);
        this.glmTable = this.buildGlmTable(resultData);
        console.log("GLM table built:", this.glmTable);

        if (!this.glmTable || this.glmTable.cohorts.length === 0) {
            this.setPlaceholderView(ALGORITHMS.GLM, 'No GLM data was returned for this analysis.');
            return;
        }

        // Build charts
        this.buildGlmCharts();

        this.currentView = 'glm';
    }

    buildGlmTable(resultData: any): GlmDisplayTable | null {
        const cohorts = resultData?.cohorts;
        const details = resultData?.details;

        if (!cohorts || typeof cohorts !== 'object') {
            console.log("No cohorts data found");
            return null;
        }

        const glmCohorts: GlmCohortModel[] = [];

        Object.entries(cohorts).forEach(([cohortName, cohortData]: [string, any]) => {
            if (!cohortData || typeof cohortData !== 'object') {
                return;
            }

            const coefficients = cohortData.coefficients || {};
            const betaObj = coefficients.beta || {};
            const seObj = coefficients.std_error || {};
            const zObj = coefficients.z_value || {};
            const pObj = coefficients.p_value || {};

            const predictorNames = Object.keys(betaObj).filter(k => k !== 'Intercept');
            const coefficientRows: GlmCoefficient[] = predictorNames.map(predictor => ({
                predictor,
                beta: Number(betaObj[predictor] ?? 0),
                stdError: Number(seObj[predictor] ?? 0),
                zValue: Number(zObj[predictor] ?? 0),
                pValue: Number(pObj[predictor] ?? 0)
            }));

            const cohortDetails = cohortData.details || {};
            glmCohorts.push({
                cohortName,
                coefficients: coefficientRows,
                details: {
                    converged: Boolean(cohortDetails.converged),
                    dispersion: Number(cohortDetails.dispersion ?? 0),
                    isDispersionEstimated: Boolean(cohortDetails.is_dispersion_estimated),
                    numObservations: Number(cohortDetails.num_observations ?? 0),
                    numVariables: Number(cohortDetails.num_variables ?? 0),
                    nullDeviance: Number(cohortDetails.null_deviance ?? 0),
                    deviance: Number(cohortDetails.deviance ?? 0)
                }
            });
        });

        return {
            cohorts: glmCohorts,
            globalDetails: {
                iterations: Number(details?.iterations ?? 0),
                allConverged: Boolean(details?.all_converged)
            }
        };
    }

    buildGlmCharts(): void {
        if (!this.glmTable || this.glmTable.cohorts.length === 0) {
            return;
        }

        // Build coefficient (forest plot) chart
        this.buildGlmCoefficientChart();
        // Build deviance reduction chart
        this.buildGlmDevianceChart();
    }

    buildGlmCoefficientChart(): void {
        if (!this.glmTable) return;

        const colors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6'];

        // Get unique predictors from all cohorts
        const predictorSet = new Set<string>();
        this.glmTable.cohorts.forEach(cohort => {
            cohort.coefficients.forEach(coef => {
                predictorSet.add(coef.predictor);
            });
        });

        const predictors = Array.from(predictorSet).sort();
        const datasets: ChartData<'bar'>['datasets'] = [];

        this.glmTable.cohorts.forEach((cohort, cohortIndex) => {
            const color = colors[cohortIndex % colors.length];
            const data: number[] = [];

            predictors.forEach(predictor => {
                const coef = cohort.coefficients.find(c => c.predictor === predictor);
                if (coef) {
                    data.push(coef.beta);
                } else {
                    data.push(0);
                }
            });

            datasets.push({
                label: this.formatLabel(cohort.cohortName),
                data: data,
                borderColor: color,
                backgroundColor: color + '80',
                borderWidth: 2
            });
        });

        this.glmCoefficientChartData = {
            labels: predictors,
            datasets: datasets
        };

        this.glmCoefficientChartOptions = {
            ...this.glmCoefficientChartOptions,
            plugins: {
                ...this.glmCoefficientChartOptions?.plugins,
                title: {
                    display: true,
                    text: 'Coefficients by Cohort (95% CI) - Forest Plot'
                }
            }
        };
    }

    buildGlmDevianceChart(): void {
        if (!this.glmTable) return;

        const cohortLabels = this.glmTable.cohorts.map(c => this.formatLabel(c.cohortName));
        const nullDeviances = this.glmTable.cohorts.map(c => c.details.nullDeviance);
        const modelDeviances = this.glmTable.cohorts.map(c => c.details.deviance);

        this.glmDevianceChartData = {
            labels: cohortLabels,
            datasets: [
                {
                    label: 'Null Deviance',
                    data: nullDeviances,
                    backgroundColor: '#bbbbbb',
                    borderColor: '#999999',
                    borderWidth: 1
                },
                {
                    label: 'Model Deviance',
                    data: modelDeviances,
                    backgroundColor: '#888888',
                    borderColor: '#555555',
                    borderWidth: 1
                }
            ]
        };

        this.glmDevianceChartOptions = {
            ...this.glmDevianceChartOptions,
            plugins: {
                ...this.glmDevianceChartOptions?.plugins,
                title: {
                    display: true,
                    text: 'Deviance Reduction'
                }
            }
        };
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
        this.glmTable = null;
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

        const resultEntries = Object.entries(resultData || {});

        const tables: CrosstabDisplayTable[] = [];

        resultEntries.forEach(([cohortName, cohortData]: [string, any]) => {
            console.log("cohortName:", cohortName);
            console.log("cohortData:", cohortData);

            const contingencyTable = Array.isArray(cohortData?.contingency_table) ? cohortData.contingency_table : [];
            if (contingencyTable.length === 0) {
                return;
            }

            const resolvedRowHeaders = rowHeaders.length > 0 ? rowHeaders : this.detectRowHeaders(contingencyTable);
            const valueHeaders = this.getOrderedValueColumns(contingencyTable, resolvedRowHeaders);
            const columnVariable = cohortData?.col_var || this.selectedAlgorithm?.col_var || '';

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