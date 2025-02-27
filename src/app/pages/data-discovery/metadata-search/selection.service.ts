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

  //   saveData(data: any[]): void {
  //       this.data = data;
  //   }  

  //   getData(): any[] {
  //       return this.data;
  //   }

    getDataSelected(): any[] {
        return this.selection.selected;
    }

  //   setDataSelected(idVariable: string): void {
  //       // console.log("hola",this.data.find((variable: { variable_name: string; }) => variable.variable_name === idVariable));
        
  //       this.dataSelected.push(this.data.find((variable: { variable_name: string; }) => variable.variable_name === idVariable));
  //   }
  //   setDataDeSelected(idVariable: string): void {
  //       this.dataSelected.filter((variable: { variable_name: string; }) => variable.variable_name !== idVariable);
  //   }




  // /** Toggle selection for a row */
  // toggleSelection(row: MetadataVariables): void {
  //   this.selection.toggle(row);
  // }

  // /** Check if a row is selected */
  // isSelected(row: MetadataVariables): boolean {
  //   return this.selection.isSelected(row);
  // }

  // /** Clear all selected rows */
  // clearSelection(): void {
  //   this.selection.clear();
  // }

  // /** Select all rows */
  // selectAll(rows: MetadataVariables[]): void {
  //   this.selection.select(...rows);
  // }

  // /** Check if all rows are selected */
  // isAllSelected(rows: MetadataVariables[]): boolean {
  //   return this.selection.selected.length === rows.length;
  // }


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