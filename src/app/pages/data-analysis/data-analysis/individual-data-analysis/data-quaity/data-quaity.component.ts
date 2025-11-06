import { Component, EventEmitter, OnInit, Output } from '@angular/core';

@Component({
  selector: 'app-data-quaity',
  templateUrl: './data-quaity.component.html',
  styleUrl: './data-quaity.component.scss'
})
export class DataQuaityComponent implements OnInit{

  @Output() previousStep = new EventEmitter<void>();
  @Output() nextStep = new EventEmitter<void>();

  constructor() { }

  ngOnInit(): void {
  }

  
  goBack() {
    this.previousStep.emit();
  }
  goNext() {
    this.nextStep.emit();
  }

}
