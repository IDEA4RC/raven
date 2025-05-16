import { SelectionModel } from '@angular/cdk/collections';
import { Component, ViewChildren, QueryList, OnInit, AfterViewInit, Input, ViewChild, OnChanges, SimpleChanges } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from "@angular/material/paginator";
import { MatSort } from '@angular/material/sort';
import { BreakpointObserver } from '@angular/cdk/layout';
import {MatTableModule} from '@angular/material/table';
import { MetadataVariables } from '../metadata.model';
import { animate, state, style, transition, trigger} from '@angular/animations';


import { SelectionService } from '../selection.service';




@Component({
  selector: 'app-detail-analysis-table',
  templateUrl: './detail-analysis-table.component.html',
  styleUrl: './detail-analysis-table.component.scss',
  animations: [
    trigger('detailExpand', [
      state('collapsed', style({ height: '0px', minHeight: '0', visibility: 'hidden', overflow: 'hidden' })),
      state('expanded', style({ height: '*', visibility: 'visible' })),
      transition('expanded <=> collapsed', animate('225ms cubic-bezier(0.4, 0.0, 0.2, 1)')),
    ])
  ]
})
export class DetailAnalysisTableComponent implements OnInit, OnChanges{

  @Input() variableData: any;
  @Input() center: any;


  constructor(public selectionService: SelectionService) { }

  
  dataSourceAll = new MatTableDataSource<any>();
  // displayedColumns: string[] = ['select', 'variable_name', 'variable_description', 'datatype', 'values'];
  // displayedColumnsWithExpand = [...this.displayedColumns, 'expand'];
  
  centers: any[] = [];


  filteredDataSources: { [key: string]: MatTableDataSource<any> } = {};

  selectionVariables = new SelectionModel<any>(true, []);

  detailedDataMapped: any[] = [];

  @ViewChild(MatSort) sort!: MatSort;
  @ViewChild(MatPaginator) paginator!: MatPaginator;

  /**
   * Desde aqui se define la tabla
   */
  displayedColumns: string[] = ['select', 'variable_name', 'variable_description', 'entity'];
  displayedColumnsWithExpand = [...this.displayedColumns, 'expand'];
  expandedElement: any | null;



  /** Checks whether an element is expanded. */
  isExpanded(element: any) {
    return this.expandedElement === element;
  }

  /** Toggles the expanded state of an element. */
  toggle(element: any) {
    this.expandedElement = this.isExpanded(element) ? null : element;
  }

  
ngOnInit() {    

  // this.dataSourceAll.data = this.variableData;

  

  this.variableData = this.variableData
  .map((item: any) => {
    // Filter the centers based on availability_d
    const filteredCenters = item.centers.filter((centerObj: any) => {
      const centerName = Object.keys(centerObj)[0];
      return centerName == this.center;
    });

    // Only include the item if it has at least one matching center
    if (filteredCenters.length > 0) {
      return {
        ...item,
        centers: filteredCenters[0][this.center],
      };
    }
    return null;
  })
  .filter((item: null) => item !== null);

  
  // Mark all variables as selected
  this.variableData.forEach((variable: any) => {
    this.selectionVariables.select(variable);
    
  })
  
  this.dataSourceAll.data = this.variableData;
  

}

// Detects when the search has been applied
ngOnChanges(changes: SimpleChanges) {
  if (changes['variableData']) {      
    this.dataSourceAll.data = this.variableData; // Re-assign to trigger update
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


// Function to check the availability of a variable for a center and for field (D, P, R)
// checkAvailability(variable: any, centerColumn: any, field:any) {
//   return variable.centers.filter((center: any) => Object.keys(center)[0] == centerColumn)[0][centerColumn][field];
// }

}

