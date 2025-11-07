import { Component } from '@angular/core';

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

}
