import { Component } from '@angular/core';

@Component({
  selector: 'app-form-horizontal',
  templateUrl: './form-horizontal.component.html',
})
export class AppFormHorizontalComponent {
  constructor() {}
  hide = true;
  hide2 = true;
  conhide = true;
  alignhide = true;

  // 3 accordian
  step = 0;

  setStep(index: number) {
    this.step = index;
  }

  nextStep() {
    this.step++;
  }

  prevStep() {
    this.step--;
  }

  panelOpenState = false;
}
