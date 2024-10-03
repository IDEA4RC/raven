import { Component } from '@angular/core';

@Component({
  selector: 'app-radio',
  templateUrl: './radio.component.html',
})
export class AppRadioComponent {
  constructor() {}

  //   ngModel
  favoriteSeason: string;
  seasons: string[] = ['Winter', 'Spring', 'Summer', 'Autumn'];
}
