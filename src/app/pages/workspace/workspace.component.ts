import { Component, inject } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { WorkspaceHistoryTableComponent } from './workspace-history-table/workspace-history-table.component';
@Component({
  selector: 'app-workspace',
  templateUrl: './workspace.component.html',
  styleUrl: './workspace.component.scss'
})
export class WorkspaceComponent {

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

  

}
