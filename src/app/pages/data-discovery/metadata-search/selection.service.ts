import { Injectable } from '@angular/core';
import { SelectionModel } from '@angular/cdk/collections';
import { MetadataVariables } from './metadata.model';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class SelectionService {

  // Selection of the variables
  selectionVariables = new SelectionModel<MetadataVariables>(true, []);
  private selectedVariablesSubject = new BehaviorSubject<any[]>([]);
  selectedVariables$ = this.selectedVariablesSubject.asObservable();

  // Selection of the centers
  selectionCenters = new SelectionModel<MetadataVariables>(true, []);
  private selectedCentersSubject = new BehaviorSubject<any[]>([]);
  selectedCenters$ = this.selectedCentersSubject.asObservable();

  data: any[] = [];
  dataSelected: any[] = [];

  constructor() {}



  getDataSelected(): any[] {
      return this.selectionVariables.selected;
  }


  selectAll(data: any[]): void {

    data.forEach((row) => this.selectionVariables.select(row));
    
    this.selectedVariablesSubject.next(data);
  }

  toggleSelection(row: any): void {
    this.selectionVariables.toggle(row);

    this.selectedVariablesSubject.next([this.selectionVariables.isSelected(row), row]); // Emit updated data
  }

  clearSelection(data: any[]): void {
    data.forEach((row: MetadataVariables) => this.selectionVariables.deselect(row));

    this.selectedVariablesSubject.next([]);
  }

  getData(): any[] {
    return this.selectedVariablesSubject.value;
  }

  /**
   *  Selection of the centers
   * */ 

  // Select all centers
  selectAllCenters(centers: any[]): void {

    centers.forEach((center) => this.selectionCenters.select(center.center));
    
  }
  // Toggle selection of a center
  toggleSelectionCenters(center: any): void {
    this.selectionCenters.toggle(center);
  }
  // Clear selection of centers
  clearSelectionCenters(): void {
    this.selectionCenters.clear();
  }
  // Get selected centers
  // If forServer is true, centers whose capsule lives on a different server are remapped
  // (e.g. the IIS-FJD capsule is actually hosted at UPM).
  getSelectedCenters(forServer: boolean = false): any[] {
    const selected = this.selectionCenters.selected;
    if (!forServer) {
      return selected;
    }
    const serverMapping: { [center: string]: string } = {
      'IIS-FJD': 'UPM',
    };
    return selected.map((center: any) => serverMapping[center] ?? center);
  }

}