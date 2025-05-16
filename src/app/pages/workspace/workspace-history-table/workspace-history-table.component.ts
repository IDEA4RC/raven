import { SelectionModel } from '@angular/cdk/collections';
import { Component, ViewChildren, QueryList, OnInit, AfterViewInit, Input, ViewChild, OnChanges, SimpleChanges } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from "@angular/material/paginator";
import { MatSort } from '@angular/material/sort';
import { BreakpointObserver } from '@angular/cdk/layout';
import {MatTableModule} from '@angular/material/table';
import { WorkspaceHistory } from './workspace-history.model';

@Component({
  selector: 'app-workspace-history-table',
  templateUrl: './workspace-history-table.component.html',
  styleUrl: './workspace-history-table.component.scss'
})
export class WorkspaceHistoryTableComponent implements OnInit{
  // @Input() historyData: any;
  constructor() { }

  
  dataSource = new MatTableDataSource<WorkspaceHistory>();
  displayedColumns: string[] = ['date', 'time', 'action', 'phase', 'details'];

  filteredDataSources: { [key: string]: MatTableDataSource<any> } = {};


  @ViewChild(MatSort) sort!: MatSort;
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  
  ngOnInit() {

    // this.dataSource.data = this.historyData
    // }) as MetadataVariables[];

    this.dataSource.data = [
      { id: 2, date: new Date().toLocaleDateString('en-GB'), time: '11:00', action: 'Iniciated data acces application', phase: 'Data Permit', details: 'The data permit application has been iniciated to request data access' },
      { id: 3, date: new Date().toLocaleDateString('en-GB'), time: '12:00', action: "Created workspace", phase: "Metadata Search", details: "Metadata Search has been finished and the workspace has been created" },
      { id: 4, date: new Date().toLocaleDateString('en-GB'), time: '12:00', action: "Finished Metadata Search", phase: "Metadata Search", details: "Metadata Search has been finished, variables and CoEs selected" }

    ];
  
  }

  

  ngAfterViewInit(): void {
    
    this.dataSource.sort = this.sort;
    this.dataSource.paginator = this.paginator;
  }


}
