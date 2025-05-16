import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MaterialModule } from '../../material.module';
import { MatNativeDateModule } from '@angular/material/core';
import { NgApexchartsModule } from 'ng-apexcharts';

import { DiscoveryRoutes } from './data-discovery.routing';

import { MetadataSearchComponent } from './metadata-search/metadata-search.component';
import { VariablesTableComponent } from './metadata-search/variables-table/variables-table.component';
import { AvailabilityTableComponent } from './metadata-search/availability-table/availability-table.component';
import { DetailAnalysisTableComponent } from './metadata-search/detail-analysis-table/detail-analysis-table.component';
import { VariablesSearcherComponent } from './metadata-search/variables-searcher/variables-searcher.component';
import { MatTableModule } from '@angular/material/table';
import { MatSortModule } from '@angular/material/sort';
import { MatPaginatorModule } from '@angular/material/paginator';

import {
  MatDialog,
  MatDialogRef,
  MatDialogActions,
  MatDialogClose,
  MatDialogTitle,
  MatDialogContent,
  MatDialogModule,
  } from '@angular/material/dialog';
import { DialogformLoginComponent } from './metadata-search/dialogform-login/dialogform-login.component';

@NgModule({
  declarations: [MetadataSearchComponent, VariablesTableComponent, AvailabilityTableComponent, DetailAnalysisTableComponent, VariablesSearcherComponent, DialogformLoginComponent],
  imports: [
    CommonModule,
    RouterModule.forChild(DiscoveryRoutes),
    TranslateModule,
    FormsModule,
    ReactiveFormsModule,
    MaterialModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatNativeDateModule,
    NgApexchartsModule,
    MatDialogModule
  ]
})
export class DataDiscoveryModule { }
