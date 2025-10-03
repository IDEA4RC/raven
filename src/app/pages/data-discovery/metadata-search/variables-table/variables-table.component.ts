import { SelectionModel } from '@angular/cdk/collections';
import { Component, ViewChildren, QueryList, OnInit, AfterViewInit, Input, ViewChild, OnChanges, SimpleChanges } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from "@angular/material/paginator";
import { MatSort } from '@angular/material/sort';
import { BreakpointObserver } from '@angular/cdk/layout';
import {MatTableModule} from '@angular/material/table';
import { MetadataVariables } from '../metadata.model';

import { SelectionService } from '../selection.service';

@Component({
  selector: 'app-variables-table',
  templateUrl: './variables-table.component.html',
  styleUrl: './variables-table.component.scss'
})
export class VariablesTableComponent implements OnInit, OnChanges{
  @Input() variableData: any;
  @Input() entity: any;
  constructor(
    public selectionService: SelectionService) { }

  
  dataSourceAll = new MatTableDataSource<MetadataVariables>();
  displayedColumns: string[] = ['select', 'variable_name', 'variable_description', 'datatype', 'values'];

  filteredDataSources: { [key: string]: MatTableDataSource<any> } = {};

  selection = new SelectionModel<any>(true, []);

  @ViewChild(MatSort) sort!: MatSort;
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  
  ngOnInit() {

    this.dataSourceAll.data = this.variableData.filter((variable: { entity: any; }) => {
      return this.entity === "All" || variable.entity === this.entity;
    }) as MetadataVariables[];

    if(this.entity === "All") {
      this.displayedColumns = ['select', 'variable_name', 'variable_description', 'entity', 'datatype', 'values'];
    }

    // Subscribe to variables selection changes
    this.selectionService.selectedVariables$.subscribe(updtedRow => {
      if(updtedRow.length === 0) {
        this.selection.clear();
      } else if(updtedRow[0] == true ||  updtedRow[0] == false) {
        this.updateSelection(updtedRow[0], updtedRow[1]);
        
      } else {
        updtedRow.forEach((row) => 
          this.selection.select(row)
      );
    }

    
    });
  }

  // Detects when the search has been applied
  ngOnChanges(changes: SimpleChanges) {
    if (changes['variableData']) {      
      this.dataSourceAll.data = this.variableData.filter((variable: { entity: any; }) => {
        return this.entity === "All" || variable.entity === this.entity;
      }) as MetadataVariables[]; // Re-assign to trigger update
    }
  }

  ngAfterViewInit(): void {
    
    this.dataSourceAll.sort = this.sort;
    this.dataSourceAll.paginator = this.paginator;
  }

  /** Updates the selection state when changes occur */
  updateSelection(isSelected:any, row:any) {
    if(isSelected) {
      this.selection.select(row);
    } else {
      this.selection.deselect(row);
    }
  }

  /** Toggle selection and update the service */
  action(row: any) {
    this.selectionService.toggleSelection(row);
  }



  /** Whether the number of selected elements matches the total number of rows. */
  isAllSelected(): any {
    const numSelected = this.selection.selected.length;
    const numRows = this.dataSourceAll.data.length;
    return numSelected === numRows;
  }

  /** Selects all rows if they are not all selected; otherwise clear selection. */
  masterToggle(): void {    
    if(this.isAllSelected()) {
      this.selection.clear();
      this.selectionService.clearSelection(this.dataSourceAll.data);
    } else {
      this.dataSourceAll.data.forEach((row) => this.selection.select(row));
      this.selectionService.selectAll(this.dataSourceAll.data);
    }
      
  }

  /** The label for the checkbox on the passed row */
  checkboxLabel(row?: MetadataVariables): string {
    if (!row) {
      return `${this.isAllSelected() ? 'select' : 'deselect'} all`;
    } 
    return `${this.selection.isSelected(row) ? 'deselect' : 'select'} row ${
      row.variable_name + 1
    }`;
  }


}
