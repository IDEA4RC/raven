import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';

import { DiscoveryRoutes } from './data-discovery.routing';

import { MetadataSearchComponent } from './metadata-search/metadata-search.component';

@NgModule({
  declarations: [MetadataSearchComponent],
  imports: [
    CommonModule,
    RouterModule.forChild(DiscoveryRoutes),

  ]
})
export class DataDiscoveryModule { }
