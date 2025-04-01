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
  selector: 'app-availability-table',
  templateUrl: './availability-table.component.html',
  styleUrl: './availability-table.component.scss'
})
export class AvailabilityTableComponent implements OnInit, OnChanges{
  @Input() variableData: any;

  constructor(public selectionService: SelectionService) { }

  
  dataSourceAll = new MatTableDataSource<any>();
  displayedColumns: string[] = []
  // centers= [
  //   { id: 'int', name: 'INT', years: '2014-2020' },
  //   { id: 'iss', name: 'ISS-FJD', years: '2012-2021' },
  //   { id: 'aphp', name: 'APHP', years: '2016-2022' },
  //   { id: 'vgr', name: 'VGR', years: '2015-2020' },
  //   { id: 'msci', name: 'MSCI', years: '2018-' }
  // ]
  centers: any[] = [];
  // variables= [
  //   { name: 'Sex', availability: { int: '✔️', iss: '✔️', aphp: '✔️', vgr: '✔️', msci: '✔️' } },
  //   { name: 'Birth Year', availability: { int: '✔️', iss: '✔️', aphp: '✔️', vgr: '✔️', msci: '✔️' } },
  //   { name: 'Histology group', availability: { int: '✔️', iss: '❌', aphp: '⬤', vgr: '⬤', msci: '✔️' } },
  //   { name: 'Topography', availability: { int: '✔️', iss: '✔️', aphp: '⬤', vgr: '⬤', msci: '✔️' } },
  //   { name: 'Loco-regional stage', availability: { int: '❌', iss: '✔️', aphp: '✔️', vgr: '✔️', msci: '✔️' } },
  //   { name: 'Treatment response', availability: { int: '✔️', iss: '✔️', aphp: '❌', vgr: '❌', msci: '✔️' } }
  // ]


  filteredDataSources: { [key: string]: MatTableDataSource<any> } = {};

  selectionVariables = new SelectionModel<any>(true, []);
  selectionCenters = new SelectionModel<any>(true, []);

  @ViewChild(MatSort) sort!: MatSort;
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  
  ngOnInit() {

    this.displayedColumns = ['select', 'variable_name'];

    this.dataSourceAll.data = this.variableData;

    // Extract the centers and years to define the columns of the table
    if(this.variableData.length > 0) {
      let centersData = this.variableData[0].centers;
      this.centers = this.extractCentersYears(centersData);
      this.displayedColumns = ['select', 'variable_name', ... this.centers.map(center => center.center)];

    }
    

    // Subscribe to variables selection changes
    this.selectionService.selectedVariables$.subscribe(updtedRow => {
      if(updtedRow.length === 0) {
        this.selectionVariables.clear();
      } else if(updtedRow[0] == true ||  updtedRow[0] == false) {
        this.updateSelection(updtedRow[0], updtedRow[1]);
        
      } else {
        updtedRow.forEach((row) => 
          this.selectionVariables.select(row)
      );
    }

    
    });
  }

  // Detects when the search has been applied
  ngOnChanges(changes: SimpleChanges) {
    if (changes['variableData']) {      
      this.dataSourceAll.data = this.variableData; // Re-assign to trigger update

      // Extract the centers and years to define the columns
      if(this.variableData.length > 0) {
        let centersData = this.variableData[0].centers;
        this.centers = this.extractCentersYears(centersData);
        this.displayedColumns = ['select', 'variable_name', ... this.centers.map(center => center.center)];
        console.log(centersData.filter((center: any) => Object.keys(center)[0] == 'INT')[0]['INT']);
        
      }
      
    }
  }

  ngAfterViewInit(): void {
    
    this.dataSourceAll.sort = this.sort;
    this.dataSourceAll.paginator = this.paginator;
  }

  /** Updates the selection state when changes occur */
  updateSelection(isSelected:any, row:any) {
    if(isSelected) {
      this.selectionVariables.select(row);
    } else {
      this.selectionVariables.deselect(row);
    }
  }

  /** Toggle selection and update the service */
  action(row: any) {
    this.selectionService.toggleSelection(row);
  }


// Functions to select the variables

/** Whether the number of selected elements matches the total number of rows. */
isAllSelected(): any {
  const numSelected = this.selectionVariables.selected.length;
  const numRows = this.dataSourceAll.data.length;
  return numSelected === numRows;
}

/** Selects all rows if they are not all selected; otherwise clear selection. */
masterToggle(): void {    
  if(this.isAllSelected()) {
    this.selectionVariables.clear();
    this.selectionService.clearSelection(this.dataSourceAll.data);
  } else {
    this.dataSourceAll.data.forEach((row) => this.selectionVariables.select(row));
    this.selectionService.selectAll(this.dataSourceAll.data);
  }
    
}

/** The label for the checkbox on the passed row */
checkboxLabel(row?: MetadataVariables): string {
  if (!row) {
    return `${this.isAllSelected() ? 'select' : 'deselect'} all`;
  } 
  return `${this.selectionVariables.isSelected(row) ? 'deselect' : 'select'} row ${
    row.variable_name + 1
  }`;
}

// Functions to extract the centers

 /** Whether the number of selected elements matches the total number of rows. */
 isAllSelectedCenters(): any {
  const numSelected = this.selectionCenters.selected.length;
  const numRows = this.centers.length;
  return numSelected === numRows;
}

/** Selects all rows if they are not all selected; otherwise clear selection. */
masterToggleCenters(): void { 
  
  // Check if all centers are selected
  if(this.isAllSelectedCenters()) {
    // If all are selected, clear the selection
    this.selectionCenters.clear();
    this.selectionService.clearSelectionCenters(this.centers);
  } else {
    // If not all are selected, select all
    this.centers.forEach((center) => this.selectionCenters.select(center.center));
    this.selectionService.selectAllCenters(this.centers);
  }
    
}

/** The label for the checkbox on the passed row */
checkboxLabelCenters(row?: MetadataVariables): string {

  if (!row) {
    return `${this.isAllSelectedCenters() ? 'select' : 'deselect'} all`;
  } 
  return `${this.selectionCenters.isSelected(row) ? 'deselect' : 'select'} row ${
    // row.variable_name + 1
    row
  }`;
}

/** Toggle selection center and update the service */
actionCenter(row: any) {
  this.selectionService.toggleSelectionCenters(row);
}

// Extracts the center and years from the centers object
extractCentersYears(centers: any[]): { center: string; years: string }[] {
  return centers.map(centerObj => {
      const centerName = Object.keys(centerObj)[0]; // Extract the center name
      const years = centerObj[centerName].years; // Extract the years
      return { center: centerName, years };
  });
}
// Function to check the availability of a variable for a center and for field (D, P, R)
checkAvailability(variable: any, centerColumn: any, field:any) {
  return variable.centers.filter((center: any) => Object.keys(center)[0] == centerColumn)[0][centerColumn][field];
}



}
