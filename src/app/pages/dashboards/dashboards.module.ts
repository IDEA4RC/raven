import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { DatePipe } from '@angular/common';

// map
// import { DxVectorMapModule, DxPieChartModule } from 'devextreme-angular';

import { DashboardsRoutes } from './dashboards.routing';

@NgModule({
  imports: [RouterModule.forChild(DashboardsRoutes)],
  providers: [DatePipe],
})
export class DashboardsModule {}
