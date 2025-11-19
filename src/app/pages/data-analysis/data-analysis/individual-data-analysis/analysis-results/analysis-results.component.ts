import { Component } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';

@Component({
  selector: 'app-analysis-results',
  templateUrl: './analysis-results.component.html',
  styleUrl: './analysis-results.component.scss'
})
export class AnalysisResultsComponent {

  displayedColumns = ['id', 'name', 'status', 'org', 'user', 'created'];
  data = [
    { id: 450, name: 'Average Age', status: 'Completed', org: 'INT', user: 'J. Perez', created: '25/04/2024' }
  ];

  subtasks = [
    { name: 'INT', status: 'Completed' },
    { name: 'ISS-FJF', status: 'Completed' },
    { name: 'APHP', status: 'Completed' }
  ];


  displayedColumns2: string[] = ['site', 'total', 'longBones', 'pelvis', 'ribs', 'spine'];

  dataSource = new MatTableDataSource<any>([
    { site: 'Cohort 1 - No metastatic', total: 305, longBones: '79 (25.90%)', pelvis: '70 (22.95%)', ribs: '73 (23.93%)', spine: '83 (27.21%)' },
    { site: 'Cohort 1 - Metastatic', total: 139, longBones: '32 (23.02%)', pelvis: '41 (29.50%)', ribs: '38 (27.34%)', spine: '28 (20.14%)', alt: true },
    { site: 'Cohort 2 - No metastatic', total: 410, longBones: '99 (24.15%)', pelvis: '107 (26.10%)', ribs: '97 (23.66%)', spine: '107 (26.10%)' },
    { site: 'Cohort 2 - Metastatic', total: 190, longBones: '51 (26.84%)', pelvis: '43 (22.63%)', ribs: '53 (27.89%)', spine: '43 (22.63%)', alt: true }
  ]);

}
