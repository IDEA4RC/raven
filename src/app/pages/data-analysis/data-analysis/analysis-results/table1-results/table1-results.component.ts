import { Component, Input, OnChanges } from '@angular/core';
import { DataAnalysisService } from '../../data-analysis.service';

interface Table1Row {
  characteristic: string;
  isSub: boolean;
  [key: string]: any;
}


interface Table1Group {
  id: string;
  label: string;
  visible: boolean;
  expanded: boolean;
  mainRow: Table1Row;
  subRows: Table1Row[];
}
interface Table1DisplayTable {
  rows: Table1Row[];
  cohortNames: string[];
  cohortCounts: { [cohort: string]: number };
}

@Component({
  selector: 'app-table1-results',
  templateUrl: './table1-results.component.html',
  styleUrl: './table1-results.component.scss'
})

export class Table1ResultsComponent implements OnChanges {
  @Input() resultData: any;
  @Input() topographyMap: Record<string, string> = {};
  @Input() selectedAlgorithm: any = null;

  table: Table1DisplayTable | null = null;
  groups: Table1Group[] = [];

  isEditing = true;

  defaultVisibleVariables: string[] = [
    'sex',
    'age_at_diagnosis',
    'year_of_birth',
    'clinical_stage',
    'topography',
    'morphology',
    'topography_group',
    'morphology_type',
    'morphology_subtype',
    'topography_macrogroup',
    'topography_subsite',
  ];

  constructor(
      private dataAnalysisService: DataAnalysisService,
     
    ) { }
  ngOnChanges(): void {
    this.renderTable1();
  }

  renderTable1(): void {

    console.log("resultData *************: ", this.resultData);
    console.log("selectedAlgorithm *************: ", this.selectedAlgorithm);
    if (!this.resultData) {
      this.table = null;
      this.groups = [];
      return;
    }

    const firstKey = Object.keys(this.resultData)[0];
    const rawResult = this.resultData[firstKey];

    if (!rawResult) {
      this.table = null;
      this.groups = [];
      return;
    }

    const result = this.normalizeResult(rawResult);

    const cohortNames = Object.keys(result);
    const rows: Table1Row[] = [];

    const varsNum = Array.from(
      new Set(
        cohortNames.flatMap(c =>
          Object.keys(result[c]?.numeric || {})
        )
      )
    );

    const varsCat = Array.from(
      new Set(
        cohortNames.flatMap(c =>
          Object.keys(result[c]?.counts_unique_values || {})
        )
      )
    );

    const varsDate = Array.from(
      new Set(
        cohortNames.flatMap(c =>
          Object.keys(result[c]?.date || {})
        )
      )
    );

    const missingValues = ['N/A', 'N/A2'];

    // =========================
    // NUMERIC
    // =========================
    varsNum.forEach(varNum => {
      rows.push({
        characteristic: this.formatLabel(varNum),
        isSub: false,
        ...Object.fromEntries(cohortNames.map(c => [c, '']))
      });

      rows.push({
        characteristic: 'Mean (std)',
        isSub: true,
        ...Object.fromEntries(cohortNames.map(c => {
          const stats = result[c]?.numeric?.[varNum];

          const mean =
            stats?.mean ??
            this.computeMean(stats);

          if (mean === null || Number.isNaN(mean)) {
            return [c, '-'];
          }

          const std = stats?.std;

          if (std === undefined || std === null || Number.isNaN(std)) {
            return [c, `${mean.toFixed(1)}`];
          }

          return [c, `${mean.toFixed(1)} (${std.toFixed(1)})`];
        }))
      });

      rows.push({
        characteristic: 'Min',
        isSub: true,
        ...Object.fromEntries(cohortNames.map(c => {
          const val = result[c]?.numeric?.[varNum]?.min;
          return [c, Number.isNaN(val) || val === undefined || val === null ? '-' : `${Math.round(val)}`];
        }))
      });

      rows.push({
        characteristic: 'Max',
        isSub: true,
        ...Object.fromEntries(cohortNames.map(c => {
          const val = result[c]?.numeric?.[varNum]?.max;
          return [c, Number.isNaN(val) || val === undefined || val === null ? '-' : `${Math.round(val)}`];
        }))
      });

      rows.push({
        characteristic: 'Missing',
        isSub: true,
        ...Object.fromEntries(cohortNames.map(c => {
          const val = result[c]?.numeric?.[varNum]?.missing;
          return [c, Number.isNaN(val) || val === undefined || val === null ? '-' : `${Math.round(val)}`];
        }))
      });
    });

    // =========================
    // CATEGORICAL
    // =========================
    varsCat.forEach(varCat => {
      rows.push({
        characteristic: this.formatLabel(varCat),
        isSub: false,
        ...Object.fromEntries(cohortNames.map(c => [c, '']))
      });

      const allKeys = new Set<string>();

      cohortNames.forEach(c => {
        Object.keys(result[c]?.counts_unique_values?.[varCat] || {})
          .forEach(k => allKeys.add(k));
      });

      const keys = Array.from(allKeys).sort();

      const totals = cohortNames.map(c =>
        Object.values(result[c]?.counts_unique_values?.[varCat] || {})
          .reduce((a: number, b: any) => a + b, 0)
      );

      keys.forEach(key => {
        if (!missingValues.includes(key)) {
          let displayValue = key;

          if (varCat === 'topography') {
            displayValue = this.topographyMap[key] || key;
          } else {
            displayValue = key.charAt(0).toUpperCase() + key.slice(1);
          }

          rows.push({
            characteristic: displayValue,
            isSub: true,
            ...Object.fromEntries(cohortNames.map((c, i) => {
              const count = result[c]?.counts_unique_values?.[varCat]?.[key] || 0;
              const pct = totals[i] > 0 ? (count / totals[i] * 100) : 0;
              return [c, `${count} (${pct.toFixed(1)}%)`];
            }))
          });
        }
      });

      rows.push({
        characteristic: 'Missing',
        isSub: true,
        ...Object.fromEntries(cohortNames.map((c, i) => {
          const counts = result[c]?.counts_unique_values?.[varCat] || {};

          const missingCount = Object.keys(counts)
            .filter(k => missingValues.includes(k))
            .reduce((sum, k) => sum + counts[k], 0);

          const pct = totals[i] > 0 ? (missingCount / totals[i] * 100) : 0;

          return [c, `${missingCount} (${pct.toFixed(1)}%)`];
        }))
      });
    });

    // =========================
    // DATE
    // =========================
    varsDate.forEach(varDate => {
      rows.push({
        characteristic: this.formatLabel(varDate),
        isSub: false,
        ...Object.fromEntries(cohortNames.map(c => [c, '']))
      });

      rows.push({
        characteristic: 'Total',
        isSub: true,
        ...Object.fromEntries(cohortNames.map(c => {
          const stats = result[c]?.date?.[varDate];
          const val = stats?.count;

          if (!val) {
            return [c, '-'];
          }

          return [c, String(val)];
        }))
      });

      rows.push({
        characteristic: 'Min',
        isSub: true,
        ...Object.fromEntries(cohortNames.map(c => {
          const val = result[c]?.date?.[varDate]?.min;
          return [c, val ? this.formatDate(val) : '-'];
        }))
      });

      rows.push({
        characteristic: 'Max',
        isSub: true,
        ...Object.fromEntries(cohortNames.map(c => {
          const val = result[c]?.date?.[varDate]?.max;
          return [c, val ? this.formatDate(val) : '-'];
        }))
      });

      rows.push({
        characteristic: 'Missing',
        isSub: true,
        ...Object.fromEntries(cohortNames.map(c => {
          const val = result[c]?.date?.[varDate]?.missing;
          return [c, Number.isNaN(val) || val === undefined || val === null ? '-' : `${Math.round(val)}`];
        }))
      });
    });

    const cohortCounts = Object.fromEntries(
      cohortNames.map(c => [c, result[c]?.num_rows ?? 0])
    );

    this.table = {
      rows,
      cohortNames,
      cohortCounts
    };

    this.buildGroups();
  }

  private buildGroups(): void {
    if (!this.table?.rows?.length) {
      this.groups = [];
      return;
    }

    const groups: Table1Group[] = [];
    let currentGroup: Table1Group | null = null;

    for (const row of this.table.rows) {
      if (!row.isSub) {
        currentGroup = {
          id: this.normalizeVariableName(row.characteristic),
          label: row.characteristic,
          visible: true,
          expanded: true,
          mainRow: row,
          subRows: []
        };

        groups.push(currentGroup);
      } else if (currentGroup) {
        currentGroup.subRows.push(row);
      }
    }

    this.groups = groups;
  }

  toggleVisible(group: Table1Group): void {
    group.visible = !group.visible;
  }

  toggleExpanded(group: Table1Group): void {
    group.expanded = !group.expanded;
  }

  expandAll(): void {
    this.groups.forEach(group => {
      group.expanded = true;
    });
  }

  collapseAll(): void {
    this.groups.forEach(group => {
      group.expanded = false;
    });
  }

  selectAll(): void {
    this.groups.forEach(group => {
      group.visible = true;
    });
  }

  deselectAll(): void {
    this.groups.forEach(group => {
      group.visible = false;
    });
  }

  selectDefaultVariables(): void {
    const normalizedDefaults = this.defaultVisibleVariables.map(variable =>
      this.normalizeVariableName(variable)
    );

    this.groups.forEach(group => {
      group.visible = normalizedDefaults.includes(group.id);
      group.expanded = true;
    });
  }

  private computeMean(stats: any): number | null {
    if (!stats) {
      return null;
    }

    const sum = stats.sum;
    const count = stats.count;

    if (typeof sum === 'number' && typeof count === 'number' && count > 0) {
      return sum / count;
    }

    return null;
  }

  private normalizeResult(rawResult: any): any {
    const result: any = {};

    const orgMap: Record<string, string> = {
      '5': 'UKE',
      '4': 'INT',
      '7': 'FPNS',
      '9': 'OUS',
      '10': 'MSCI',
      '6': 'CLB',
      '11': 'APHP',
      '8': 'VGR'
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

      if (orgId === '11') {
        (partial.partials || []).forEach((partialAphp: any) => {
          const orgIdAphp = String(partialAphp.organization_id);

          if (orgIdAphp === '11') {
            result[cohort] = {
              numeric: partialAphp.numeric || {},
              counts_unique_values: partialAphp.counts_unique_values || {},
              date: partialAphp.date || {},
              num_rows: numRows
            };
          }
        });
      } else {
        result[cohort] = {
          numeric: partial.numeric || {},
          counts_unique_values: partial.counts_unique_values || {},
          date: partial.date || {},
          num_rows: numRows
        };
      }
    });

    return result;
  }

  private normalizeVariableName(value: string): string {
    return String(value || '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '_');
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
      return '-';
    }

    return date.toISOString().slice(0, 10);
  }

  getSelectedVariables(): string[] {
    return this.groups
      .filter(g => g.visible)
      .map(g => g.label); // o id real si lo tienes
  }

  finishEditing(): void {
    this.isEditing = false;

    // Expandir todo al salir
    this.groups.forEach(g => g.expanded = true);

    const selected = this.getSelectedVariables();

    // 1. Guardar en local (default)
    localStorage.setItem('table1_default_selection', JSON.stringify(selected));

    // 2. Enviar al backend
    this.saveView(selected);
  }

  saveView(selectedVariables: string[]): void {
    const analysisId = this.selectedAlgorithm?.cohorts[0]?.analysis_id || null
    
    const cohortIds = this.selectedAlgorithm?.cohorts[0]?.id || null
    if (!analysisId || !cohortIds) {
      console.error('Missing analysisId or cohortIds. Cannot save view.');
      return;
    }
    const payload = {
      name: 'default',
      analysis_id: analysisId,
      cohort_ids: cohortIds,
      selected_variables: selectedVariables
    };

    console.log('Saving view with payload:', payload);
   
  }


  startEditing(): void {
    this.isEditing = true;
  }

  get hiddenCount(): number {
    return this.groups.filter(g => !g.visible).length;
  }
}