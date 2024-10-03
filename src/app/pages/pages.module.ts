import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { StarterComponent } from './starter/starter.component';
import { PagesRoutes } from './pages.routing.module';
import { MaterialModule } from '../material.module';
import { FormsModule } from '@angular/forms';

@NgModule({
  declarations: [StarterComponent],
  imports: [
    CommonModule,
    MaterialModule,
    FormsModule,
    RouterModule.forChild(PagesRoutes),
  ],
})
export class PagesModule {}
