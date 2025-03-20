import { Injectable } from '@angular/core';
import { SelectionModel } from '@angular/cdk/collections';
import { MetadataVariables } from './metadata.model';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class SelectionService {
  selection = new SelectionModel<MetadataVariables>(true, []);
  private selectedDataSubject = new BehaviorSubject<any[]>([]);
  selectedData$ = this.selectedDataSubject.asObservable();

  data: any[] = [];
  dataSelected: any[] = [];

  constructor() {}



  getDataSelected(): any[] {
      return this.selection.selected;
  }


  selectAll(data: any[]): void {

    data.forEach((row) => this.selection.select(row));
    
    this.selectedDataSubject.next(data);
  }

  toggleSelection(row: any): void {
    this.selection.toggle(row);

    this.selectedDataSubject.next([this.selection.isSelected(row), row]); // Emit updated data
  }

  clearSelection(data: any[]): void {
    data.forEach((row: MetadataVariables) => this.selection.deselect(row));

    this.selectedDataSubject.next([]);
  }

  getData(): any[] {
    return this.selectedDataSubject.value;
  }
}