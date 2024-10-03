import { Component } from '@angular/core';
import { CoreService } from 'src/app/services/core.service';
@Component({
  selector: 'app-side-two-steps',
  templateUrl: './side-two-steps.component.html',
})
export class AppSideTwoStepsComponent {
  options = this.settings.getOptions();
  
  constructor(private settings: CoreService) {}
}
