import { Component, Input, OnChanges } from '@angular/core';
import { ChartConfiguration, ChartData } from 'chart.js';


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

@Component({
  selector: 'app-kaplan-meier-results',

  templateUrl: './kaplan-meier-results.component.html',
  styleUrl: './kaplan-meier-results.component.scss'
})
export class KaplanMeierResultsComponent implements OnChanges {
  @Input() resultData: any;

  kaplanMeierTables: KaplanMeierDisplayTable[] = [];
  logRankTables: LogRankDisplayTable[] = [];

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


  ngOnInit(): void {
    this.kaplanMeierTables = this.buildKaplanMeierTables(this.resultData);
    this.logRankTables = this.buildLogRankTables(this.resultData);
    this.buildKaplanMeierChart();
  }

  ngOnChanges(): void {
    this.kaplanMeierTables = this.buildKaplanMeierTables(this.resultData);
    this.logRankTables = this.buildLogRankTables(this.resultData);
    this.buildKaplanMeierChart();
  }

  renderKaplanMeier(resultData: any): void {
    this.kaplanMeierTables = this.buildKaplanMeierTables(resultData);
    this.logRankTables = this.buildLogRankTables(resultData);

    if (this.kaplanMeierTables.length === 0) {
      this.setNoResultsView('No Kaplan-Meier data was returned for this analysis.');
      return;
    }

    // Build chart data
    this.buildKaplanMeierChart();

  }

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

  formatLabel(value: string): string {
    return String(value || '')
      .replace(/_/g, ' ')
      .replace(/\b\w/g, char => char.toUpperCase());
  }

  setNoResultsView(message?: string): void {

    this.kaplanMeierTables = [];
    this.logRankTables = [];
  }
}