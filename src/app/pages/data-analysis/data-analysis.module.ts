import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DataAnalysisComponent } from './data-analysis/data-analysis.component';
import { AnalysisRoutes } from './data-analysis.routing';
import { RouterModule } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MaterialModule } from '../../material.module';
import { MatNativeDateModule } from '@angular/material/core';
import { NgApexchartsModule } from 'ng-apexcharts';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSortModule } from '@angular/material/sort';
import { MatDialogModule } from '@angular/material/dialog';
import { CohortSelectionComponent } from './data-analysis/individual-data-analysis/cohort-selection/cohort-selection.component';
import { DataQuaityComponent } from "./data-analysis/individual-data-analysis/data-quaity/data-quaity.component";
import { DataPreparationComponent } from './data-analysis/individual-data-analysis/data-preparation/data-preparation.component';
import { AnalyticSelectionComponent } from './data-analysis/individual-data-analysis/analytic-selection/analytic-selection.component';
import { AnalysisResultsComponent } from './data-analysis/individual-data-analysis/analysis-results/analysis-results.component';
import { IndividualDataAnalysisComponent } from './data-analysis/individual-data-analysis/individual-data-analysis.component';
import { NewAnalysisComponent } from './data-analysis/new-analysis/new-analysis.component';
import { Dialog } from '@angular/cdk/dialog';
import { DialogformDeleteAnalysisComponent } from './data-analysis/dialogform-delete-analysis/dialogform-delete-analysis.component';

@NgModule({
  declarations: [DataAnalysisComponent, NewAnalysisComponent, IndividualDataAnalysisComponent, CohortSelectionComponent, 
    DataQuaityComponent, DataPreparationComponent, AnalyticSelectionComponent, AnalysisResultsComponent, DialogformDeleteAnalysisComponent],
  imports: [
    CommonModule,
    RouterModule.forChild(AnalysisRoutes),
    TranslateModule,
    FormsModule,
    ReactiveFormsModule,
    MaterialModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatNativeDateModule,
    NgApexchartsModule,
    MatDialogModule,
]
})
export class DataAnalysisModule { }
