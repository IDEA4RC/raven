import { Injectable } from '@angular/core';
import { SelectionModel } from '@angular/cdk/collections';
import { MetadataVariables } from './metadata.model';

@Injectable({
  providedIn: 'root',
})
export class SelectionService {
  selection = new SelectionModel<MetadataVariables>(true, []);

  data: any[] = [];
  dataSelected: any[] = [];

    constructor() {}

    saveData(data: any[]): void {
        this.data = data;
    }  

    getData(): any[] {
        return this.data;
    }

    getDataSelected(): any[] {
        return this.dataSelected;
    }




  /** Toggle selection for a row */
  toggleSelection(row: MetadataVariables): void {
    this.selection.toggle(row);
  }

  /** Check if a row is selected */
  isSelected(row: MetadataVariables): boolean {
    return this.selection.isSelected(row);
  }

  /** Clear all selected rows */
  clearSelection(): void {
    this.selection.clear();
  }

  /** Select all rows */
  selectAll(rows: MetadataVariables[]): void {
    this.selection.select(...rows);
  }

  /** Check if all rows are selected */
  isAllSelected(rows: MetadataVariables[]): boolean {
    return this.selection.selected.length === rows.length;
  }



//   /** Updates the selection and notifies all components */
//   toggleSelection(row: any): void {
//     this.selection.toggle(row);
//   }

//   /** Checks if a row is selected */
//   isSelected(row: any): boolean {
//     return this.selection.isSelected(row);
//   }

//   /** Clears selection */
//   clearSelection(): void {
//     this.selection.clear();
//   }

//   /** Selects all rows */
//   selectAll(rows: any[]): void {
//     this.selection.select(...rows);
//   }
}