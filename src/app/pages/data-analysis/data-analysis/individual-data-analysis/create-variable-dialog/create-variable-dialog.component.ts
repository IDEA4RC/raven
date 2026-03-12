import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Inject, Component, OnInit } from '@angular/core';

interface VariableOption {
  variable_name: string;
  variable_id: string;
  datatype: string;
}

interface OperationOption {
  label: string;
  value: 'add' | 'subtract' | 'multiply' | 'divide';
}

@Component({
  selector: 'app-create-variable-dialog',
  templateUrl: './create-variable-dialog.component.html',
  styleUrl: './create-variable-dialog.component.scss'
})
export class CreateVariableDialogComponent implements OnInit {
  form: FormGroup;

  // Prepared for future categories; for now only computed variables are enabled.
  categoryOptions = ['computed_variables'];

  operationOptions: OperationOption[] = [
    { label: 'Add', value: 'add' },
    { label: 'Subtract', value: 'subtract' },
    { label: 'Multiply', value: 'multiply' },
    { label: 'Divide', value: 'divide' }
  ];

  variables: VariableOption[] = [];
  numericVariables: VariableOption[] = [];

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<CreateVariableDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    this.form = this.fb.group({
      category: ['computed_variables', Validators.required],
      column1: [null, Validators.required],
      column2: [null, Validators.required],
      operation: ['add', Validators.required],
      outputColumn: ['', Validators.required],
      description: ['']
    });
  }

  ngOnInit(): void {
    this.variables = Array.isArray(this.data?.variables) ? this.data.variables : [];

    this.numericVariables = this.variables.filter(variable => {
      const datatype = (variable?.datatype || '').toLowerCase();
      return datatype === 'number' || datatype === 'float' || datatype.includes('int') || datatype.includes('double');
    });
  }

  getAvailableColumn2(): VariableOption[] {
    const selectedColumn1 = this.form.get('column1')?.value;
    if (!selectedColumn1) {
      return this.numericVariables;
    }

    return this.numericVariables.filter(variable => variable.variable_id !== selectedColumn1);
  }

  cancel(): void {
    this.dialogRef.close();
  }

  submit(): void {
    if (this.form.invalid) {
      return;
    }

    const dataframeId = Number(this.data?.dataframe_id || 0);
    const column1 = this.form.get('column1')?.value;
    const column2 = this.form.get('column2')?.value;

    if (!dataframeId || !column1 || !column2 || column1 === column2) {
      return;
    }

    const payload = {
      dataframe_id: dataframeId,
      column1,
      column2,
      operation: this.form.get('operation')?.value,
      output_column: this.form.get('outputColumn')?.value
    };

    this.dialogRef.close(payload);
  }
}
