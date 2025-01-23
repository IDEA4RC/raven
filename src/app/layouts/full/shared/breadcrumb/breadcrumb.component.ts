import { Component, ViewChild } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { Router, NavigationEnd, ActivatedRoute, Data, RouterModule } from '@angular/router';
import { filter, map, mergeMap } from 'rxjs/operators';
import { CoreService } from 'src/app/services/core.service';

import {
  ApexChart,
  ChartComponent,
  ApexDataLabels,
  ApexLegend,
  ApexStroke,
  ApexTooltip,
  ApexAxisChartSeries,
  ApexXAxis,
  ApexYAxis,
  ApexGrid,
  ApexPlotOptions,
  ApexFill,
  ApexMarkers,
  NgApexchartsModule,
} from 'ng-apexcharts';

export interface breadcrumbOption {
  series: ApexAxisChartSeries;
  chart: ApexChart;
  dataLabels: ApexDataLabels;
  plotOptions: ApexPlotOptions;
  yaxis: ApexYAxis;
  xaxis: ApexXAxis;
  fill: ApexFill;
  tooltip: ApexTooltip;
  stroke: ApexStroke;
  legend: ApexLegend;
  grid: ApexGrid;
  marker: ApexMarkers;
}


@Component({
  selector: 'app-breadcrumb',
  standalone: true,
  imports: [NgApexchartsModule, RouterModule],
  templateUrl: './breadcrumb.component.html',
  styleUrl: './breadcrumb.component.scss'
})
export class AppBreadcrumbComponent {
  @ViewChild('chart') chart: ChartComponent = Object.create(null);

  public breadcrumbOption!: Partial<breadcrumbOption> | any;
  public breadcrumb2Option!: Partial<breadcrumbOption> | any;

  // @Input() layout;
  pageInfo: Data | any = Object.create(null);

  options = this.settings.getOptions();

  constructor(
    private settings: CoreService,
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private titleService: Title
  ) {
   


    // for breadcrumb
    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .pipe(map(() => this.activatedRoute))
      .pipe(
        map((route) => {
          while (route.firstChild) {
            route = route.firstChild;
          }
          return route;
        })
      )
      .pipe(filter((route) => route.outlet === 'primary'))
      .pipe(mergeMap((route) => route.data))
      // tslint:disable-next-line - Disables all
      .subscribe((event) => {
        // tslint:disable-next-line - Disables all
        // this.titleService.setTitle(event['title'] + ' - Angular 17');
        this.titleService.setTitle('RAVEN');
        this.pageInfo = event;
      });
  }
}
