import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NgApexchartsModule } from 'ng-apexcharts';
import { MaterialModule } from '../../material.module';
// icons
import { TablerIconsModule } from 'angular-tabler-icons';
import * as TablerIcons from 'angular-tabler-icons/icons';

import { ChartsRoutes } from './charts.routing';
import { AppAreaChartComponent } from './area/area.component';
import { AppCandlestickChartComponent } from './candlestick/candlestick.component';
import { AppColumnChartComponent } from './column/column.component';
import { AppDoughnutpieChartComponent } from './doughnut-pie/doughnut-pie.component';
import { AppGredientChartComponent } from './gredient/gredient.component';
import { AppLineChartComponent } from './line/line.component';
import { AppRadialRadarChartComponent } from './radial-radar/radial-radar.component';

@NgModule({
  imports: [
    CommonModule,
    RouterModule.forChild(ChartsRoutes),
    MaterialModule,
    FormsModule,
    ReactiveFormsModule,
    NgApexchartsModule,
    TablerIconsModule.pick(TablerIcons),
  ],
  exports: [TablerIconsModule],
  declarations: [
    AppAreaChartComponent,
    AppCandlestickChartComponent,
    AppColumnChartComponent,
    AppDoughnutpieChartComponent,
    AppGredientChartComponent,
    AppLineChartComponent,
    AppRadialRadarChartComponent,
  ],
})
export class ChartsModule {}
