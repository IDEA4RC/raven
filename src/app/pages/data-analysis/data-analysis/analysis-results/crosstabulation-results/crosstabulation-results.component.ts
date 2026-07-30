import { Component, Input, OnChanges } from '@angular/core';

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

@Component({
  selector: 'app-crosstabulation-results',

  templateUrl: './crosstabulation-results.component.html',
  styleUrl: './crosstabulation-results.component.scss'
})
export class CrosstabulationResultsComponent implements OnChanges {
  @Input() resultData: any;
  @Input() selectedAlgorithm: any;

  crosstabTables: CrosstabDisplayTable[] = [];

  ngOnChanges(): void {
    this.renderCrosstabulation(this.resultData);
  }

  renderCrosstabulation(resultData: any): void {
    this.crosstabTables = this.buildCrosstabTables(resultData);
  }

  buildCrosstabTables(resultData: any): CrosstabDisplayTable[] {
    const rowHeaders = this.parseRowVariables(this.selectedAlgorithm);
    const resultEntries = Object.entries(resultData || {});
    const tables: CrosstabDisplayTable[] = [];

    resultEntries.forEach(([cohortName, cohortData]: [string, any]) => {
      const contingencyTable = Array.isArray(cohortData?.contingency_table)
        ? cohortData.contingency_table
        : [];

      if (contingencyTable.length === 0) {
        return;
      }

      const resolvedRowHeaders = rowHeaders.length > 0
        ? rowHeaders
        : this.detectRowHeaders(contingencyTable);

      const valueHeaders = this.getOrderedValueColumns(contingencyTable, resolvedRowHeaders);
      const columnVariable = cohortData?.col_var || this.selectedAlgorithm?.col_var || '';

      const totals = this.calculateCrosstabTotals(
        contingencyTable,
        resolvedRowHeaders,
        valueHeaders
      );

      tables.push({
        cohortName,
        rowHeaders: resolvedRowHeaders,
        valueHeaders,
        columnVariable,
        rows: contingencyTable.map((row: Record<string, unknown>) =>
          this.buildCrosstabRow(row, resolvedRowHeaders, valueHeaders, totals)
        ),
        chi2: cohortData?.chi2?.chi2,
        pValue: cohortData?.chi2?.['P-value']
      });
    });

    return tables;
  }

  private calculateCrosstabTotals(
    contingencyTable: Record<string, unknown>[],
    rowHeaders: string[],
    valueHeaders: string[]
  ): {
    rowTotals: Map<Record<string, unknown>, number>;
    columnTotals: Record<string, number>;
  } {
    const rowTotals = new Map<Record<string, unknown>, number>();
    const columnTotals: Record<string, number> = {};

    valueHeaders
      .filter(header => header !== 'Total')
      .forEach(header => {
        columnTotals[header] = 0;
      });

    contingencyTable.forEach(row => {
      const isTotalRow = rowHeaders.some(header =>
        this.toDisplayValue(row[header]).toLowerCase() === 'total'
      );

      if (isTotalRow) {
        return;
      }

      let rowTotal = 0;

      valueHeaders.forEach(header => {
        if (header === 'Total') {
          return;
        }

        const value = Number(row[header] || 0);

        if (Number.isFinite(value)) {
          rowTotal += value;
          columnTotals[header] += value;
        }
      });

      rowTotals.set(row, rowTotal);
    });

    return {
      rowTotals,
      columnTotals
    };
  }

  buildCrosstabRow(
    row: Record<string, unknown>,
    rowHeaders: string[],
    valueHeaders: string[],
    totals: {
      rowTotals: Map<Record<string, unknown>, number>;
      columnTotals: Record<string, number>;
    }
  ): CrosstabDisplayRow {
    const rowValues = rowHeaders.reduce((acc, header) => {
      acc[header] = this.toDisplayValue(row[header]);
      return acc;
    }, {} as Record<string, string>);

    const isTotalRow = rowHeaders.some(header =>
      this.toDisplayValue(row[header]).toLowerCase() === 'total'
    );

    const rowTotal = totals.rowTotals.get(row) || 0;

    const valueValues = valueHeaders.reduce((acc, header) => {
      const rawValue = Number(row[header] || 0);

      if (header === 'Total' || isTotalRow) {
        acc[header] = this.toDisplayValue(row[header]);
        return acc;
      }

      const columnTotal = Number(totals.columnTotals[header] || 0);

      const rowPercent = rowTotal > 0
        ? (rawValue / rowTotal) * 100
        : 0;

      const columnPercent = columnTotal > 0
        ? (rawValue / columnTotal) * 100
        : 0;

      acc[header] = `${rawValue} (${rowPercent.toFixed(1)}%  ${columnPercent.toFixed(1)}% )`;

      return acc;
    }, {} as Record<string, string>);

    return {
      rowValues,
      valueValues,
      isTotalRow
    };
  }

  parseRowVariables(selectedAlgorithm: any): string[] {
    if (!selectedAlgorithm) {
      return [];
    }

    if (selectedAlgorithm.row_var_list) {
      return selectedAlgorithm.row_var_list
        .split(',')
        .map((variable: string) => variable.trim())
        .filter((variable: string) => variable.length > 0);
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
        return parsedInput.variablesList
          .map((value: unknown) => String(value).trim())
          .filter((value: string) => value.length > 0);
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

  getOrderedValueColumns(
    contingencyTable: Array<Record<string, unknown>>,
    rowHeaders: string[]
  ): string[] {
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

  toDisplayValue(value: unknown): string {
    if (value === null || value === undefined || value === '') {
      return '';
    }

    return String(value);
  }
}