import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MaterialModule } from '../../material.module';
import { MatNativeDateModule } from '@angular/material/core';

import { DiscoveryRoutes } from './data-discovery.routing';

import { MetadataSearchComponent } from './metadata-search/metadata-search.component';

@NgModule({
  declarations: [MetadataSearchComponent],
  imports: [
    CommonModule,
    RouterModule.forChild(DiscoveryRoutes),
    TranslateModule,
    FormsModule,
    ReactiveFormsModule,
    MaterialModule,
    MatNativeDateModule
  ]
})
export class DataDiscoveryModule { }
