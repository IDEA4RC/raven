import { Component, Output, EventEmitter } from '@angular/core';

@Component({
  selector: 'app-searcher',
  templateUrl: './variables-searcher.component.html',
  styleUrl: './variables-searcher.component.scss'
})
export class VariablesSearcherComponent {
  @Output() search = new EventEmitter<string>();

  applyFilter(event: Event) {
    
    const filterValue = (event.target as HTMLInputElement).value;
    this.search.emit(filterValue); // Emit the string, not an Event
  }
  
}
