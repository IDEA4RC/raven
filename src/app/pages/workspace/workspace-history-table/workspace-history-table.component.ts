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
  @Input() historyData: any;

  constructor() { }

  
  dataSource = new MatTableDataSource<WorkspaceHistory>();
  displayedColumns: string[] = ['date', 'time', 'action', 'phase', 'description'];

  filteredDataSources: { [key: string]: MatTableDataSource<any> } = {};


  @ViewChild(MatSort) sort!: MatSort;
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  
  ngOnInit() {
    
    this.dataSource.data = this.historyData
  }

  // Detects when the search has been applied
  ngOnChanges(changes: SimpleChanges) {
    if (changes['historyData']) {
      this.dataSource.data = this.historyData
    }
  }

  
  ngAfterViewInit(): void {
    
    this.dataSource.sort = this.sort;
    this.dataSource.paginator = this.paginator;
  }


}
