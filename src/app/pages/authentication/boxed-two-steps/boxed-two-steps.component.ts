import { Component } from '@angular/core';
import { CoreService } from 'src/app/services/core.service';

@Component({
  selector: 'app-boxed-two-steps',
  templateUrl: './boxed-two-steps.component.html',
})
export class AppBoxedTwoStepsComponent {
  options = this.settings.getOptions();
  
  constructor(private settings: CoreService) {}
}
