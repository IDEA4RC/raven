import { Component, Input, OnChanges } from '@angular/core';

interface TTestDisplayRow {
  variableName: string;
  metrics: Record<string, string>;
}

interface TTestDisplayTable {
  cohortName: string;
  metricHeaders: string[];
  rows: TTestDisplayRow[];
}

@Component({
  selector: 'app-t-test-results',

  templateUrl: './t-test-results.component.html',
  styleUrl: './t-test-results.component.scss'
})
export class TTestResultsComponent implements OnChanges {
  @Input() resultData: any;

  tTestTables: TTestDisplayTable[] = [];

  ngOnChanges(): void {
    this.renderTTest(this.resultData);
  }

  renderTTest(resultData: any): void {
    this.tTestTables = this.buildTTestTables(resultData);
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

  formatLabel(value: string): string {
    if (!value) {
      return '';
    }

    return value
      .replace(/_/g, ' ')
      .split(' ')
      .filter(part => part.length > 0)
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }
}