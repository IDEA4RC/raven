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
        min: 0,
        title: {
          display: true,
          text: 'Time (years)'
        },
        ticks: {
          callback: (value) => {
            const v = Number(value);
            return Number.isInteger(v) ? `${v}` : v.toFixed(1);
          }
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
      },
      tooltip: {
        // Only show the survival curves, not the invisible CI band datasets
        filter: (item) => !!item.dataset.label,
        callbacks: {
          title: (items) => {
            const raw: any = items[0]?.raw;
            if (raw?.days == null) return '';
            return `${this.formatDuration(raw.days)} (${raw.x.toFixed(2)} years)`;
          },
          label: (item) => {
            const raw: any = item.raw;
            return `${item.dataset.label}: ${Number(raw.y).toFixed(4)}`;
          }
        }
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
          x: this.daysToYears(p.time),
          y: p.survival,
          days: p.time
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
            x: this.daysToYears(p.time),
            y: p.ciUpper ?? null
          }));

          const lower = curve.points.map(p => ({
            x: this.daysToYears(p.time),
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

  private static readonly DAYS_PER_YEAR = 365.25;
  private static readonly DAYS_PER_MONTH = 365.25 / 12;

  daysToYears(days: number): number {
    return days / KaplanMeierResultsComponent.DAYS_PER_YEAR;
  }

  /** Formats a duration in days as e.g. "1y 0m 6d" (average-length years/months). */
  formatDuration(days: number): string {
    if (days == null || isNaN(days)) return '-';
    if (days <= 0) return '0d';

    const { DAYS_PER_YEAR, DAYS_PER_MONTH } = KaplanMeierResultsComponent;
    let years = Math.floor(days / DAYS_PER_YEAR);
    let remainder = days - years * DAYS_PER_YEAR;
    let months = Math.floor(remainder / DAYS_PER_MONTH);
    let d = Math.round(remainder - months * DAYS_PER_MONTH);

    // Normalise rounding overflow (e.g. 30.4 days rounding up to a full month)
    if (d >= Math.round(DAYS_PER_MONTH)) { d = 0; months++; }
    if (months >= 12) { months = 0; years++; }

    const parts: string[] = [];
    if (years > 0) parts.push(`${years}y`);
    if (years > 0 || months > 0) parts.push(`${months}m`);
    parts.push(`${d}d`);
    return parts.join(' ');
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