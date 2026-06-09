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
import { MatChipsModule } from '@angular/material/chips';
import { CohortSelectionComponent } from './data-analysis/individual-data-analysis/cohort-selection/cohort-selection.component';
import { DataQuaityComponent } from "./data-analysis/individual-data-analysis/data-quaity/data-quaity.component";
import { DataPreparationComponent } from './data-analysis/individual-data-analysis/data-preparation/data-preparation.component';
import { AnalyticSelectionComponent } from './data-analysis/individual-data-analysis/analytic-selection/analytic-selection.component';
import { AnalysisResultsComponent } from './data-analysis/individual-data-analysis/analysis-results/analysis-results.component';
import { IndividualDataAnalysisComponent } from './data-analysis/individual-data-analysis/individual-data-analysis.component';
import { NewAnalysisComponent } from './data-analysis/new-analysis/new-analysis.component';
import { Dialog } from '@angular/cdk/dialog';
import { DialogformDeleteAnalysisComponent } from './data-analysis/dialogform-delete-analysis/dialogform-delete-analysis.component';
import { StatisticsTableComponent } from './data-analysis/individual-data-analysis/data-preparation/statistics-table/statistics-table.component';
import { CreateVariableDialogComponent } from './data-analysis/individual-data-analysis/create-variable-dialog/create-variable-dialog.component';
import { BaseChartDirective } from 'ng2-charts';
import { NgxMatSelectSearchModule } from 'ngx-mat-select-search';
@NgModule({
  declarations: [DataAnalysisComponent, NewAnalysisComponent, IndividualDataAnalysisComponent, CohortSelectionComponent, 
    DataQuaityComponent, DataPreparationComponent, AnalyticSelectionComponent, AnalysisResultsComponent, DialogformDeleteAnalysisComponent, StatisticsTableComponent, CreateVariableDialogComponent],
  imports: [
    CommonModule,
    RouterModule.forChild(AnalysisRoutes),
    TranslateModule,
    FormsModule,
    BaseChartDirective,
    ReactiveFormsModule,
    MaterialModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatNativeDateModule,
    NgApexchartsModule,
    MatDialogModule,
    MatChipsModule,
    NgxMatSelectSearchModule
]
})
export class DataAnalysisModule { }
