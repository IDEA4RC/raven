import { Component, Input, OnChanges } from '@angular/core';
import { ChartConfiguration, ChartData } from 'chart.js';

interface GlmDisplayTable {
  cohorts: GlmCohortModel[];
  globalDetails: {
    iterations: number;
    allConverged: boolean;
  };
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

interface GlmCoefficient {
  predictor: string;
  beta: number;
  stdError: number;
  zValue: number;
  pValue: number;
}

@Component({
  selector: 'app-glm-results',
  templateUrl: './glm-results.component.html',
  styleUrl: './glm-results.component.scss'
})
export class GlmResultsComponent implements OnChanges {
  @Input() resultData: any;

  glmTable: GlmDisplayTable | null = null;

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

  noResultsMessage: string = 'No results available.';
  ngOnChanges(): void {
    this.renderGlm(this.resultData);
  }




  formatLabel(value: string): string {
    return String(value || '')
      .replace(/_/g, ' ')
      .replace(/\b\w/g, char => char.toUpperCase());
  }

  renderGlm(resultData: any): void {
    console.log("Rendering GLM with data:", resultData);
    this.glmTable = this.buildGlmTable(resultData);
    console.log("GLM table built:", this.glmTable);

    if (!this.glmTable || this.glmTable.cohorts.length === 0) {
      this.setNoResultsView('No GLM data was returned for this analysis.');
      return;
    }

    // Build charts
    this.buildGlmCharts();

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

   setNoResultsView( message?: string): void {
       
        this.glmTable = null;
        this.noResultsMessage = message || 'No results available.';
    }
}