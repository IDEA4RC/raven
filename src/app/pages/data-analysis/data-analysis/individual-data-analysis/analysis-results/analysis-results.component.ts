import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { DataAnalysisService } from '../../data-analysis.service';
import { SelectionService } from '../selection.service';
import { ChartConfiguration, ChartData, ChartType } from 'chart.js';
import { TopographyService } from 'src/app/services/topography.service';

const ALGORITHMS = {
    CROSSTABULATION: 'crosstabulation',
    TTEST: 't-test',
    CHI_SQUARED: 'chi-squared',
    KAPLAN_MEIER: 'kaplan-meier',
    LOG_RANK_TEST: 'log-rank-test',
    GLM: 'glm',
    COXPH: 'coxph',
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
    cohorts?: any[];
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

    selectedAlgorithm: SelectedAlgorithm | null = null;
    name_algorithm = '';
    cohorts_string = 'Pending result';
    list_variables_text = '';
    row_variables_text = '';
    column_variable_text = '';
    selectedCohorts: any[] = [];
    analysisId: number | null = null;

    currentView: 'empty' | 'crosstab' | 'ttest' | 'kaplan-meier' | 'log-rank' | 'glm' | 'coxph' | 'table1' | 'placeholder' = 'empty';
    underConstructionMessage = 'Under construction';
    rawTaskResult: any = null;

    displayedColumns = ['id', 'name', 'status', 'org', 'user', 'created'];
    data: ExecutionInfoRow[] = [
        { id: '-', name: '-', status: '-', org: '-', user: '-', created: '-' }
    ];

    taskStatistics: TaskStatistics | null = null;
    executionDuration = '-';

    topographyMap: Record<string, string> = {};

    @Output() previousStep = new EventEmitter<void>();

    constructor(
        private dataAnalysisService: DataAnalysisService,
        public selectionService: SelectionService,
        private topographyService: TopographyService

    ) { }

    ngOnInit(): void {
        this.selectionService.selectedItems$.subscribe(items => {
            if (!items || items.length === 0) {
                this.currentView = 'empty';
                this.underConstructionMessage = 'No algorithm selected.';
                return;
            }

            this.selectedAlgorithm = items[0] as SelectedAlgorithm;
            this.selectedCohorts = this.selectedAlgorithm.cohorts || [];
            this.initializeSelectedAlgorithm(this.selectedAlgorithm);

            if (this.selectedAlgorithm.task_id) {
                //this.analysisId = this.selectedAlgorithm.id || null;
                this.fetchTaskResult(this.selectedAlgorithm.task_id);
                this.getTaskStatistics(this.selectedAlgorithm.task_id);
                return;
            }

            this.setPlaceholderView(this.selectedAlgorithm.method_name, 'This algorithm does not have a task result yet.');
        });

        this.topographyService.getTopographyMap().subscribe(map => {
            this.topographyMap = map;
        });
    }

    initializeSelectedAlgorithm(selectedAlgorithm: SelectedAlgorithm): void {
        console.log("Selected algorithm:", selectedAlgorithm);
        this.name_algorithm = selectedAlgorithm.method_name || '';

        const rowVariables = this.parseRowVariables(selectedAlgorithm);
        this.row_variables_text = rowVariables.map(variable => this.formatLabel(variable)).join(', ');
        this.list_variables_text = this.row_variables_text;
        this.column_variable_text = this.formatLabel(selectedAlgorithm.col_var || '');


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
                    this.cohorts_string = cohortNames.map(cohort => this.getOriginalCohortName(cohort, this.formatLabel(cohort)))
                        .join('; ');;
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
        this.rawTaskResult = resultData;

        switch (this.name_algorithm as AlgorithmMethod) {
            case ALGORITHMS.CROSSTABULATION:
                this.currentView = 'crosstab';
                break;

            case ALGORITHMS.TTEST:
                this.currentView = 'ttest';
                break;

            case ALGORITHMS.CHI_SQUARED:
                this.currentView = 'placeholder';
                this.underConstructionMessage = 'Chi-squared result rendering is not implemented yet.';
                break;

            case ALGORITHMS.KAPLAN_MEIER:
                this.currentView = 'kaplan-meier';
                break;

            case ALGORITHMS.LOG_RANK_TEST:
                this.currentView = 'log-rank';
                break;

            case ALGORITHMS.GLM:
                this.currentView = 'glm';
                break;

            case ALGORITHMS.COXPH:
                this.currentView = 'placeholder';
                this.underConstructionMessage = 'CoxPH result rendering is not implemented yet.';
                break;

            case ALGORITHMS.TABLE1:
                this.currentView = 'table1';
                break;

            case ALGORITHMS.TIME_DELTA:
            case ALGORITHMS.BASIC_ARITHMETIC:
            case ALGORITHMS.SUMMARY:
                this.currentView = 'placeholder';
                this.underConstructionMessage = `${this.formatLabel(this.name_algorithm)} result rendering is not implemented yet.`;
                break;

            default:
                this.currentView = 'placeholder';
                this.underConstructionMessage = 'This algorithm renderer is not implemented yet.';
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










    computeMean(stats: any): number | null {
        if (!stats) return null;

        const sum = stats.sum;
        const count = stats.count;

        if (typeof sum === 'number' && typeof count === 'number' && count > 0) {
            return sum / count;
        }

        return null;
    }

    normalizeResult(rawResult: any): any {
        const result: any = {};

        const orgMap: Record<string, string> = {
            '5': 'UKE',
            '4': 'INT',
            '7': 'FPNS',
            '9': 'OUS',
            '10': 'MSCI',
            '6': 'CLB',
            '11': 'APHP',
            '8': 'VGR',

        };


        (rawResult.partials || []).forEach((partial: any) => {
            const orgId = String(partial.organization_id);

            if (!orgId) {
                console.warn('No organization_id found in partial', partial);
                return;
            }

            const cohort = orgMap[orgId] || `ORG_${orgId}`;

            let numRows = 0;
            const rawNumRows = partial.num_rows_per_node;

            if (typeof rawNumRows === 'number') {
                numRows = rawNumRows;
            } else if (typeof rawNumRows === 'object' && rawNumRows !== null) {
                const values = Object.values(rawNumRows);
                numRows = values.length > 0 ? Number(values[0]) : 0;
            } else {
                console.warn('Unexpected num_rows_per_node format', rawNumRows);
            }

            result[cohort] = {
                numeric: partial.numeric || {},
                counts_unique_values: partial.counts_unique_values || {},
                date: partial.date || {},
                num_rows: numRows
            };
        });

        console.log("Normalized result:", result);

        return result;

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

        const algorithmLabel = this.formatLabel(methodName || 'This algorithm');
        this.underConstructionMessage = message || `${algorithmLabel} is under construction.`;
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

        if (
            typeof value === 'number' &&
            Number.isInteger(value) &&
            value >= 1800 &&
            value <= 3000
        ) {
            return value;
        }
        const date = new Date(value);

        if (Number.isNaN(date.getTime())) {
            return '-';
        }

        return date.toISOString().slice(0, 10);
    }


    goBack(): void {
        this.previousStep.emit();
    }

    /*
     * V1 reference intentionally kept in history:
     * the previous version rendered a fixed contingency table shape directly from dataTables.
     * This component now dispatches by method_name and builds the crosstab structure dynamically.
     */


    getOriginalCohortName(vantage6Name: string, fallback: string): string {
        const matchedCohort = this.selectedCohorts.find((cohort: any) =>
            String(cohort?.vantage6_cohort_name || '') === String(vantage6Name || '')
        );
        return matchedCohort?.cohort_name || fallback;
    }
}