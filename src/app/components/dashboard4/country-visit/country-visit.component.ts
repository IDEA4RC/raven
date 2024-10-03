import { Component, ViewChild } from '@angular/core';
import { DecimalPipe } from '@angular/common';

declare const require: any;
const mapsData = require('../../dashboard2/current-visits/worldmap.js');
// map
import {
  DxVectorMapComponent,
  DxVectorMapModule,
  DxButtonModule,
} from 'devextreme-angular';

// import * as mapsData from 'devextreme/dist/js/vectormap-data/world.js';

import { Marker, Service } from '../../dashboard2/current-visits/map.service';
import { TablerIconsModule } from 'angular-tabler-icons';
import { MaterialModule } from 'src/app/material.module';

@Component({
  selector: 'app-country-visit',
  standalone: true,
  // imports:[TablerIconsModule, MaterialModule ],
  imports: [
    TablerIconsModule,
    MaterialModule,
    DxVectorMapModule,
    DxButtonModule,
  ],
  providers: [Service],
  templateUrl: './country-visit.component.html',
})
export class AppCountryVisitsComponent {
  @ViewChild(DxVectorMapComponent, { static: false })
  vectorMap: DxVectorMapComponent;
  worldMap: any = mapsData.world;
  gdpData: Object;
  markers: Marker[];

  constructor(service: Service) {
    this.markers = service.getMarkers();
  }

  markerClick(e: any) {
    if (e.target && e.target.layer.type === 'marker') {
      e.component.center(e.target.coordinates()).zoomFactor(10);
    }
  }

  resetClick() {
    this.vectorMap.instance.center();
    this.vectorMap.instance.zoomFactor();
  }
}
