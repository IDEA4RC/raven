import { Component, inject, OnInit, ViewChild } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { WorkspaceHistoryTableComponent } from './workspace-history-table/workspace-history-table.component';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';
import { WorkspaceService } from './workspace.service';
import { MatTableDataSource } from '@angular/material/table';
import { MatSort } from '@angular/material/sort';
import { MatPaginator } from '@angular/material/paginator';
import { Workspace } from './workspace.model';
@Component({
  selector: 'app-workspace',
  templateUrl: './workspace.component.html',
  styleUrl: './workspace.component.scss'
})
export class WorkspaceComponent implements OnInit {

  workspaceData: any = {
    id: 1,
    name: 'Sarcoma Analysis',
    description: 'Description of the workspace.',
    last_modification_date: new Date(),
    formatted_date: new Date().toLocaleDateString('en-GB'), // Formats as DD/MM/YYYY
    status: 'Data Access'
  }
  private _formBuilder = inject(FormBuilder);

  historyFilterForm = this._formBuilder.group({
    date: [false],
    action: [false],
    phase: [false]
  });

  // Observables
  observable_wokspace$ : Observable<any> | undefined;

  // Table components
  dataSource = new MatTableDataSource<Workspace>();
  displayedColumns: string[] = ['name', 'last_modification', 'status', 'action'];


  @ViewChild(MatSort) sort!: MatSort;
  @ViewChild(MatPaginator) paginator!: MatPaginator;

  constructor(private workspaceService: WorkspaceService, private router: Router) { }

  ngOnInit(): void {

    // Get observables variables
    this.observable_wokspace$ = this.workspaceService.workspace;

    // Subscribe to the observable patients
    this.observable_wokspace$.subscribe((data) => {
      console.log('Workspace data:', data);
      this.dataSource.data = data as Workspace[];
      
      
    });

    // Get the workspace data
    this.workspaceService.getWorkspace()
    
  }

  ngAfterViewInit(): void {
    // Initialize the data source
    this.dataSource.sort = this.sort;
    this.dataSource.paginator = this.paginator;
  }

  applyFilter(event: Event) {
  }

  // Navigate to the metadata searach to create a new workspace
  newWorkspace() {
    this.router.navigate(['/discovery/metadata-search'])
  }

  openWorkspace(workspace: Workspace) {
    this.router.navigate(['/workspace/individual-workspace', workspace.id]);
  }
  

}
