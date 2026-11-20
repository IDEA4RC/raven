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
  cohortColumnLabelMap: Record<string, string> = {};

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

  formatHeader(column: string): string {
    if (column.startsWith('UKE') || column.startsWith('INT') || column.startsWith('APHP')
      || column.startsWith('OUS') || column.startsWith('MSCI') || column.startsWith('CLB') || column.startsWith('IIS-FJD') 
      || column.startsWith('VGR') || column.startsWith('FPNS')) {
      return column;
    }

    return this.formatVariableName(column);
  }

  private formatVariableName(name: string): string {
    if (!name) return '';

    // 1. reemplazar _
    let formatted = name.replace(/_/g, ' ');

    // 2. minúsculas + capitalizar palabras
    formatted = formatted.toLowerCase().replace(/\b\w/g, char => char.toUpperCase());

    return formatted;
  }


}
