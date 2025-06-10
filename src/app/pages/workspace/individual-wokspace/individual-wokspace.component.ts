import { Component, inject } from '@angular/core';
import { FormBuilder } from '@angular/forms';

@Component({
  selector: 'app-individual-wokspace',
  templateUrl: './individual-wokspace.component.html',
  styleUrl: './individual-wokspace.component.scss'
})
export class IndividualWokspaceComponent {
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
