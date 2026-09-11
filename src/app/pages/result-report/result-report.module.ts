import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';

import { MaterialModule } from '../../material.module';
import { ResultReportRoutes } from './result-report.routing';
import { ResultReportComponent } from './result-report/result-report.component';
import { AnalysisResultsComponent } from '../data-analysis/data-analysis/individual-data-analysis/analysis-results/analysis-results.component';

@NgModule({
  declarations: [ResultReportComponent],
  imports: [
    CommonModule,
    RouterModule.forChild(ResultReportRoutes),
    TranslateModule,
    FormsModule,
    ReactiveFormsModule,
    MaterialModule,
    AnalysisResultsComponent,
  ],
})
export class ResultReportModule {}
