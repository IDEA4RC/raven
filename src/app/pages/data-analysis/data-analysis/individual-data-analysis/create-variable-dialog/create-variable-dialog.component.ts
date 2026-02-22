import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Inject, Component, OnDestroy, OnInit, Output, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { MetadataSearchService } from '../../../../data-discovery/metadata-search/metadata-search.service';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-create-variable-dialog',
  templateUrl: './create-variable-dialog.component.html',
  styleUrl: './create-variable-dialog.component.scss'
})
export class CreateVariableDialogComponent implements OnInit, OnDestroy {
  form: FormGroup;
  categoryOptions = [
    'grouping_for_new_categorical',
    'computed_variables',
    'conditional_variables',
    'merging_variables'
  ];
  methodOptions: string[] = [];
  outputOptions = ['numeric', 'categorical'];
  observable_metadata_variables$: Observable<any> | undefined

  variables: any
  constructor(
    public metadataSearchService: MetadataSearchService,

    private fb: FormBuilder,
    private http: HttpClient,

    private dialogRef: MatDialogRef<CreateVariableDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
     this.metadataSearchService.getVariablesMetadata();
     this.observable_metadata_variables$ = this.metadataSearchService.variablesMetadata$;
     this.observable_metadata_variables$.subscribe(data => {
      this.variables = data;

    })


    this.form = this.fb.group({
      category: [null, Validators.required],
      variablesToProcess: [[], Validators.required],
      method: [null, Validators.required],
      outputType: [null, Validators.required],
      name: ['', Validators.required],
      description: ['']
    });


    this.observable_metadata_variables$
    console.log("variables: ", this.variables);


  }


  ngOnInit(): void {
    metadata: this.http.get<any[]>('./assets/jsons/metadata_v0.3.json')
    this.form.get('category')?.valueChanges.subscribe(cat => {
      switch (cat) {
        case 'Conditional variables':
          this.methodOptions = ['If-Else', 'Switch'];
          break;
        case 'Computed variables':
          this.methodOptions = ['Sum', 'Mean', 'Custom'];
          break;
        case 'Grouping for new categorical variables':
          this.methodOptions = ['Group by', 'Aggregate categories'];
          break;
        case 'Merging variables (new categories)':
          this.methodOptions = ['Merge categories', 'Map categories'];
          break;
        default:
          this.methodOptions = [];
      }
      this.form.get('method')?.reset();
    });
  }

  ngOnDestroy(): void { }

  cancel(): void {
    this.dialogRef.close();
  }

  submit(): void {
    if (this.form.valid) {
      this.dialogRef.close(this.form.value);
    }
  }
}
