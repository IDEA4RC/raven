import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Inject, Component, OnInit } from '@angular/core';
import { HostListener } from '@angular/core';

interface VariableOption {
  variable_name: string;
  variable_id: string;
  datatype: string;
}

interface UniqueValue {
  value: string;
  count: number;
}

interface OperationOption {
  label: string;
  value: 'add' | 'subtract' | 'multiply' | 'divide';
}

interface CategoryOption {
  label: string;
  value: 'computed_variables' | 'merge_variables' | 'timedelta' | 'one_hot_encoding' | 'to_boolean';
}

@Component({
  selector: 'app-create-variable-dialog',
  templateUrl: './create-variable-dialog.component.html',
  styleUrl: './create-variable-dialog.component.scss'
})
export class CreateVariableDialogComponent implements OnInit {
  form: FormGroup;

  categoryOptions: CategoryOption[] = [
    { label: 'Computed Variables (Arithmetic)', value: 'computed_variables' },
    { label: 'Merge Variables', value: 'merge_variables' },
    { label: 'TimeDelta', value: 'timedelta' },
    { label: 'One Hot Encoding', value: 'one_hot_encoding' },
    { label: 'To Boolean', value: 'to_boolean' }
  ];

  operationOptions: OperationOption[] = [
    { label: 'Add', value: 'add' },
    { label: 'Subtract', value: 'subtract' },
    { label: 'Multiply', value: 'multiply' },
    { label: 'Divide', value: 'divide' }
  ];

  variables: VariableOption[] = [];
  numericVariables: VariableOption[] = [];
  categoricalVariables: VariableOption[] = [];
  dateVariables: VariableOption[] = [];
  trueValues: string[] = [];
  availableUniqueValues: UniqueValue[] = [];
  summaryStatistics: any[] = [];

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
      prefixValue: ['', Validators.required],
      trueValueInput: [''],
      description: ['']
    });
  }

  ngOnInit(): void {
    this.variables = Array.isArray(this.data?.variables) ? this.data.variables : [];
    this.summaryStatistics = Array.isArray(this.data?.summaryStatistics) ? this.data.summaryStatistics : [];

    this.numericVariables = this.variables.filter(variable => {
      const datatype = (variable?.datatype || '').toLowerCase();
      return datatype === 'number'
        || datatype === 'float' || datatype.includes('int') || datatype.includes('double');
    });

    this.categoricalVariables = this.variables.filter(variable => {
      const datatype = (variable?.datatype || '').toLowerCase();
      return datatype === 'string' || datatype === 'categorical';
    });

    this.dateVariables = this.variables.filter(variable => {
      const datatype = (variable?.datatype || '').toLowerCase();
      return datatype === 'date' || datatype === 'datetime';
    });

    // Suscribirse a cambios en la categoría
    this.form.get('category')?.valueChanges.subscribe(() => {
      this.onCategoryChange();
    });

    // Suscribirse a cambios en column1 para actualizar valores únicos cuando es to_boolean
    this.form.get('column1')?.valueChanges.subscribe(() => {
      if (this.isToBoolean()) {
        this.updateUniqueValuesForToBoolean();
      }
    });
  }



  /**
   * Actualiza el formulario según la categoría seleccionada
   */
  onCategoryChange(): void {
    const category = this.form.get('category')?.value;

    // Resetear campos relacionados
    this.form.patchValue({
      column1: null,
      column2: null,
      operation: category === 'computed_variables' ? 'add' : null,
      prefixValue: '',
      trueValueInput: ''
    });

    // Resetear lista de trueValues
    this.trueValues = [];

    // Actualizar validadores según la categoría
    const column1Control = this.form.get('column1');
    const column2Control = this.form.get('column2');
    const operationControl = this.form.get('operation');
    const prefixControl = this.form.get('prefixValue');
    const outputColumnControl = this.form.get('outputColumn');

    // Todos necesitan column1
    column1Control?.setValidators([Validators.required]);
    column1Control?.updateValueAndValidity();

    // To Boolean: solo column y outputColumn, true_values en array
    if (category === 'to_boolean') {
      column2Control?.clearValidators();
      operationControl?.clearValidators();
      prefixControl?.clearValidators();
      outputColumnControl?.setValidators([Validators.required]);
    }
    // One Hot Encoding: solo column y prefix, no column2 ni output_column
    else if (category === 'one_hot_encoding') {
      column2Control?.clearValidators();
      operationControl?.clearValidators();
      outputColumnControl?.clearValidators();
      prefixControl?.setValidators([Validators.required]);
    }
    // TimeDelta: solo column, no column2
    else if (category === 'timedelta') {
      column2Control?.clearValidators();
      operationControl?.clearValidators();
      prefixControl?.clearValidators();
      outputColumnControl?.setValidators([Validators.required]);
    }
    // Merge y Computed: necesitan column1 y column2
    else {
      column2Control?.setValidators([Validators.required]);
      prefixControl?.clearValidators();
      outputColumnControl?.setValidators([Validators.required]);
      if (category === 'computed_variables') {
        operationControl?.setValidators([Validators.required]);
      } else {
        operationControl?.clearValidators();
      }
    }

    column2Control?.updateValueAndValidity();
    operationControl?.updateValueAndValidity();
    prefixControl?.updateValueAndValidity();
    outputColumnControl?.updateValueAndValidity();
  }

  /**
   * Retorna las variables disponibles para el primer campo según la categoría
   */
  getAvailableVariables(): VariableOption[] {
    const category = this.form.get('category')?.value;
    switch (category) {
      case 'merge_variables':
      case 'one_hot_encoding':
      case 'to_boolean':
        return this.categoricalVariables;
      case 'timedelta':
        return this.dateVariables;
      case 'computed_variables':
      default:
        return this.numericVariables;
    }
  }

  /**
   * Retorna las variables disponibles para el segundo campo
   */
  getAvailableColumn2(): VariableOption[] {
    const category = this.form.get('category')?.value;
    const availableVariables = this.getAvailableVariables();
    const selectedColumn1 = this.form.get('column1')?.value;

    if (!selectedColumn1) {
      return availableVariables;
    }

    return availableVariables.filter(variable => variable.variable_id !== selectedColumn1);
  }

  /**
   * Verifica si la categoría actual es computed_variables
   */
  isComputedVariables(): boolean {
    return this.form.get('category')?.value === 'computed_variables';
  }

  /**
   * Verifica si la categoría actual es merge_variables
   */
  isMergeVariables(): boolean {
    return this.form.get('category')?.value === 'merge_variables';
  }

  /**
   * Verifica si la categoría actual es timedelta
   */
  isTimeDelta(): boolean {
    return this.form.get('category')?.value === 'timedelta';
  }


  isOneHotEncoding(): boolean {
    return this.form.get('category')?.value === 'one_hot_encoding';
  }

  /**
   * Verifica si la categoría actual es to_boolean
   */
  isToBoolean(): boolean {
    return this.form.get('category')?.value === 'to_boolean';
  }

  /**
   * Agrega un valor a la lista de trueValues
   */
  addTrueValue(): void {
    const value = this.form.get('trueValueInput')?.value?.trim();
    if (value && !this.trueValues.includes(value)) {
      this.trueValues.push(value);
      this.form.patchValue({ trueValueInput: '' });
    }
  }

  /**
   * Elimina un valor de la lista de trueValues
   */
  removeTrueValue(value: string): void {
    const index = this.trueValues.indexOf(value);
    if (index >= 0) {
      this.trueValues.splice(index, 1);
    }
  }

  /**
   * Actualiza la lista de valores únicos disponibles para la variable seleccionada en to_boolean
   */
  updateUniqueValuesForToBoolean(): void {
    this.availableUniqueValues = [];
    const selectedVariableId = this.form.get('column1')?.value;
 
    if (!selectedVariableId || !this.summaryStatistics.length) {
      return;
    }

    // Obtener los counts_unique_values del primer cohort (asumimos que todos tienen datos similares)
    const firstStat = this.summaryStatistics[0];
    const countsUniqueValues = firstStat?.rps_cohort?.counts_unique_values?.[selectedVariableId] || {};

    // Convertir a array de UniqueValue y ordenar por count descendente
    this.availableUniqueValues = Object.entries(countsUniqueValues)
      .map(([value, count]) => ({
        value,
        count: Number(count) || 0
      }))
      .filter(item => item.value !== 'N/A') // Excluir missing values
      .sort((a, b) => b.count - a.count);
  }

  /**
   * Selecciona/deselecciona un valor único como true value
   */
  toggleUniqueValue(value: string): void {
    const index = this.trueValues.indexOf(value);
    if (index >= 0) {
      this.trueValues.splice(index, 1);
    } else {
      this.trueValues.push(value);
    }
  }

  /**
   * Verifica si un valor está seleccionado como true value
   */
  isValueSelected(value: string): boolean {
    return this.trueValues.includes(value);
  }

  cancel(): void {
    this.dialogRef.close();
  }

  submit(): void {
    if (this.form.invalid) {
      return;
    }

    const category = this.form.get('category')?.value;
    const dataframeId = Number(this.data?.dataframe_id || 0);
    const outputColumn = this.form.get('outputColumn')?.value;

    if (!dataframeId) {
      return;
    }

    const baseData = {
      dataframe_id: dataframeId
    };

    let result: any;

    switch (category) {
      case 'one_hot_encoding':
        // One Hot Encoding solo necesita column y prefix
        const column = this.form.get('column1')?.value;
        const prefix = this.form.get('prefixValue')?.value;
        if (!column || !prefix) return;

        result = {
          method: category,
          data: {
            ...baseData,
            column,
            prefix
          }
        };
        break;

      case 'timedelta':
        // TimeDelta solo necesita column
        const timedeltaColumn = this.form.get('column1')?.value;
        if (!timedeltaColumn || !outputColumn) return;

        result = {
          method: category,
          data: {
            ...baseData,
            column: timedeltaColumn,
            output_column: outputColumn
          }
        };
        break;

      case 'to_boolean':
        // To Boolean necesita column, output_column y true_values
        const toBooleanColumn = this.form.get('column1')?.value;
        if (!toBooleanColumn || !outputColumn || this.trueValues.length === 0) return;

        result = {
          method: category,
          data: {
            ...baseData,
            column: toBooleanColumn,
            output_column: outputColumn,
            true_values: this.trueValues
          }
        };
        break;

      case 'merge_variables':
      case 'computed_variables':
        // Estas dos necesitan column1 y column2
        const column1 = this.form.get('column1')?.value;
        const column2 = this.form.get('column2')?.value;

        if (!column1 || !column2 || column1 === column2 || !outputColumn) {
          return;
        }

        result = {
          method: category,
          data: {
            ...baseData,
            column1,
            column2,
            output_column: outputColumn
          }
        };

        // Agregar operation solo para computed_variables
        if (category === 'computed_variables') {
          result.data.operation = this.form.get('operation')?.value;
        }
        break;

      default:
        return;
    }

    this.dialogRef.close(result);
  }

  @HostListener('keydown.enter', ['$event'])
  handleEnter(event: KeyboardEvent) {
    event.preventDefault();

    if (this.form.valid) {
      this.submit();   // comportamiento OK
    } else {
      this.form.markAllAsTouched(); // mostrar errores
    }
  }

  @HostListener('keydown.escape', ['$event'])
  handleEscape(event: KeyboardEvent) {
    event.preventDefault();
    this.dialogRef.close(); // cerrar manualmente
  }
}
