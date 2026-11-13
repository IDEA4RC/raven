import { Component, ViewChild } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, Data, NavigationEnd, Params, Router, RouterModule, } from '@angular/router';
import { filter, map } from 'rxjs/operators';
import { CoreService } from 'src/app/services/core.service';

import {
  ApexAxisChartSeries,
  ApexChart,
  ChartComponent,
  ApexDataLabels,
  ApexLegend,
  ApexStroke,
  ApexTooltip,
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

interface BreadcrumbItem {
  title: string;
  url?: string;
}

@Component({
  selector: 'app-breadcrumb',
  standalone: true,
  imports: [NgApexchartsModule, RouterModule],
  templateUrl: './breadcrumb.component.html',
  styleUrl: './breadcrumb.component.scss',
})
export class AppBreadcrumbComponent {
  @ViewChild('chart') chart: ChartComponent = Object.create(null);

  public breadcrumbOption!: Partial<breadcrumbOption> | any;
  public breadcrumb2Option!: Partial<breadcrumbOption> | any;

  pageInfo: Data | any = Object.create(null);

  options = this.settings.getOptions();

  constructor(
    private settings: CoreService,
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private titleService: Title,
  ) {
    this.router.events
      .pipe(
        filter(
          (event): event is NavigationEnd =>
            event instanceof NavigationEnd,
        ),
        map(() => this.getBreadcrumbData()),
      )
      .subscribe((pageInfo) => {
        this.titleService.setTitle('RAVEN');
        this.pageInfo = pageInfo;
      });
  }

  private getBreadcrumbData(): Data {
    const routeParams = this.collectRouteParams();
    const deepestRoute = this.getDeepestPrimaryRoute();
    const routeData = deepestRoute.snapshot.data;

    const urls = (routeData['urls'] ?? []) as BreadcrumbItem[];

    return {
      ...routeData,
      urls: urls.map((item) => ({
        ...item,
        url: item.url
          ? this.resolveRouteParameters(item.url, routeParams)
          : undefined,
      })),
    };
  }

  private getDeepestPrimaryRoute(): ActivatedRoute {
    let route = this.activatedRoute;

    while (route.firstChild) {
      const primaryChild =
        route.children.find((child) => child.outlet === 'primary') ??
        route.firstChild;

      route = primaryChild;
    }

    return route;
  }

  private collectRouteParams(): Params {
    const params: Params = {};
    let route: ActivatedRoute | null = this.activatedRoute;

    while (route) {
      Object.assign(params, route.snapshot.params);

      route =
        route.children.find((child) => child.outlet === 'primary') ??
        route.firstChild ??
        null;
    }

    return params;
  }

  private resolveRouteParameters(
    url: string,
    params: Params,
  ): string {
    return url.replace(
      /:([A-Za-z0-9_]+)/g,
      (placeholder: string, parameterName: string) => {
        const value = params[parameterName];

        if (value === undefined || value === null) {
          console.warn(
            `Breadcrumb parameter "${parameterName}" was not found for URL "${url}"`,
          );

          return placeholder;
        }

        return encodeURIComponent(String(value));
      },
    );
  }
}