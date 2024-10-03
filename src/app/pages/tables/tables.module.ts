import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MaterialModule } from '../../material.module';
import { NgApexchartsModule } from 'ng-apexcharts';

// icons
import { TablerIconsModule } from 'angular-tabler-icons';
import * as TablerIcons from 'angular-tabler-icons/icons';

import { TablesRoutes } from './tables.routing';

// tables components
import { AppBasicTableComponent } from './basic-table/basic-table.component';
import { AppDynamicTableComponent } from './dynamic-table/dynamic-table.component';
import { AppExpandTableComponent } from './expand-table/expand-table.component';
import { AppFooterRowTableComponent } from './footer-row-table/footer-row-table.component';
import { AppHttpTableComponent } from './http-table/http-table.component';
import { AppMixTableComponent } from './mix-table/mix-table.component';
import { AppMultiHeaderFooterTableComponent } from './multi-header-footer-table/multi-header-footer-table.component';
import { AppPaginationTableComponent } from './pagination-table/pagination-table.component';
import { AppRowContextTableComponent } from './row-context-table/row-context-table.component';
import { AppSelectionTableComponent } from './selection-table/selection-table.component';
import { AppSortableTableComponent } from './sortable-table/sortable-table.component';
import { AppStickyColumnTableComponent } from './sticky-column-table/sticky-column-table.component';
import { AppStickyHeaderFooterTableComponent } from './sticky-header-footer-table/sticky-header-footer-table.component';
import { AppFilterableTableComponent } from './filterable-table/filterable-table.component';

@NgModule({
  imports: [
    CommonModule,
    RouterModule.forChild(TablesRoutes),
    MaterialModule,
    FormsModule,
    ReactiveFormsModule,
    TablerIconsModule.pick(TablerIcons),
    NgApexchartsModule,
  ],
  declarations: [
    AppBasicTableComponent,
    AppDynamicTableComponent,
    AppExpandTableComponent,
    AppFooterRowTableComponent,
    AppHttpTableComponent,
    AppMixTableComponent,
    AppMultiHeaderFooterTableComponent,
    AppPaginationTableComponent,
    AppRowContextTableComponent,
    AppSelectionTableComponent,
    AppSortableTableComponent,
    AppStickyColumnTableComponent,
    AppStickyHeaderFooterTableComponent,
    AppFilterableTableComponent,
  ],
})
export class TablesModule {}
