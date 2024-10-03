import { Component } from '@angular/core';
interface Food {
  value: string;
  viewValue: string;
}

@Component({
  selector: 'app-form-layouts',
  templateUrl: './form-layouts.component.html',
})
export class AppFormLayoutsComponent {
  constructor() {}
  foods: Food[] = [
    { value: 'steak-0', viewValue: 'One' },
    { value: 'pizza-1', viewValue: 'Two' },
    { value: 'tacos-2', viewValue: 'Three' },
    { value: 'tacos-3', viewValue: 'Four' },
  ];

  selectedFood = this.foods[2].value;
}
