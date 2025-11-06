import { Component, Input, OnChanges, OnInit } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';

@Component({
  selector: 'app-statistics-table',
  templateUrl: './statistics-table.component.html',
  styleUrl: './statistics-table.component.scss'
})
export class StatisticsTableComponent implements OnInit, OnChanges {

  @Input() type: any;
  @Input() data: any;
  @Input() columns: any;


  // Table components
  dataSource = new MatTableDataSource<any>();
  displayedColumns: string[] = [];

  constructor() { }

  ngOnInit(): void {
    
    this.loadTableData();
  }

  ngOnChanges(): void {
    this.loadTableData();
  }

  loadTableData() {
    if (this.data) {
      this.displayedColumns = this.columns;
      this.dataSource.data = this.data;
    }
    
  }
  

}
