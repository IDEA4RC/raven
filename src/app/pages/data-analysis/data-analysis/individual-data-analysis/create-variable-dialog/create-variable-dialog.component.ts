import { FormBuilder, FormGroup, Validators, FormControl } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Inject, Component, OnInit } from '@angular/core';
import { HostListener } from '@angular/core';

interface VariableOption {
  variable_name: string;
  variable_id: string;
  datatype: string;
  display_name: string
}

interface UniqueValue {
  value: string;
  count: number;
}

interface AnnotateTreatmentField {
  controlName: string;
  label: string;
}

interface OperationOption {
  label: string;
  value: 'add' | 'subtract' | 'multiply' | 'divide';
}

interface CategoryOption {
  label: string;
  value: 'computed_variables' | 'merge_variables' | 'merge_categories' | 'timedelta' | 'one_hot_encoding' | 'to_boolean' | 'annotate_treatments';
}

@Component({
  selector: 'app-create-variable-dialog',
  templateUrl: './create-variable-dialog.component.html',
  styleUrl: './create-variable-dialog.component.scss'
})
export class CreateVariableDialogComponent implements OnInit {
  private readonly annotateTreatmentDefaults = {
    prefixValue: 'trt_pattern_',
    general_rule_days: 90,
    concomitant_start_gap: 14,
    concomitant_end_gap: 14,
    surgery_postop_radio_days: 120,
    surgery_adjuvant_chemo_days: 120,
    postop_radio_concomi_start_gap: 14,
    postop_radio_concomi_end_gap: 14,
    radio_adjuvant_chemo_days: 120,
    concomi_radio_adj_start_gap: 14,
    concomi_radio_adj_end_gap: 14,
    concomi_radio_adj_to_next: 90,
    chemo_immuno_days: 180,
    neoadj_chemo_to_radio: 90,
    neoadj_chemo_to_surgery: 90,
    neoadj_concomi_to_phase: 90,
    neoadj_concomi_chemo2_start_gap: 14,
    neoadj_concomi_chemo2_end_gap: 14,
    neoadj_concomi_adj_to_next: 90,
    neoadj_radio_adj_chemo1_to_radio: 90,
    neoadj_radio_adj_chemo2_to_chemo: 90
  };

  annotateTreatmentFields: AnnotateTreatmentField[] = [
    { controlName: 'general_rule_days', label: 'General rule days' },
    { controlName: 'concomitant_start_gap', label: 'Concomitant start gap' },
    { controlName: 'concomitant_end_gap', label: 'Concomitant end gap' },
    { controlName: 'surgery_postop_radio_days', label: 'Surgery post-op radio days' },
    { controlName: 'surgery_adjuvant_chemo_days', label: 'Surgery adjuvant chemo days' },
    { controlName: 'postop_radio_concomi_start_gap', label: 'Post-op radio concomitant start gap' },
    { controlName: 'postop_radio_concomi_end_gap', label: 'Post-op radio concomitant end gap' },
    { controlName: 'radio_adjuvant_chemo_days', label: 'Radio adjuvant chemo days' },
    { controlName: 'concomi_radio_adj_start_gap', label: 'Concomitant radio adjuvant start gap' },
    { controlName: 'concomi_radio_adj_end_gap', label: 'Concomitant radio adjuvant end gap' },
    { controlName: 'concomi_radio_adj_to_next', label: 'Concomitant radio adjuvant to next' },
    { controlName: 'chemo_immuno_days', label: 'Chemo immuno days' },
    { controlName: 'neoadj_chemo_to_radio', label: 'Neoadjuvant chemo to radio' },
    { controlName: 'neoadj_chemo_to_surgery', label: 'Neoadjuvant chemo to surgery' },
    { controlName: 'neoadj_concomi_to_phase', label: 'Neoadjuvant concomitant to phase' },
    { controlName: 'neoadj_concomi_chemo2_start_gap', label: 'Neoadjuvant concomitant chemo2 start gap' },
    { controlName: 'neoadj_concomi_chemo2_end_gap', label: 'Neoadjuvant concomitant chemo2 end gap' },
    { controlName: 'neoadj_concomi_adj_to_next', label: 'Neoadjuvant concomitant adjuvant to next' },
    { controlName: 'neoadj_radio_adj_chemo1_to_radio', label: 'Neoadjuvant radio adjuvant chemo1 to radio' },
    { controlName: 'neoadj_radio_adj_chemo2_to_chemo', label: 'Neoadjuvant radio adjuvant chemo2 to chemo' }
  ];

  form: FormGroup;

  categoryOptions: CategoryOption[] = [
    { label: 'Computed Variables (Arithmetic)', value: 'computed_variables' },
    { label: 'Merge Variables', value: 'merge_variables' },
    { label: 'Merge Categories', value: 'merge_categories' },
    { label: 'TimeDelta', value: 'timedelta' },
    { label: 'One Hot Encoding', value: 'one_hot_encoding' },
    { label: 'To Boolean', value: 'to_boolean' },
    { label: 'Annotate Treatments', value: 'annotate_treatments' }
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
  mergeCategoryGroups: Array<{ groupName: string; categories: string[] }> = [];
  availableUniqueValues: UniqueValue[] = [];
  summaryStatistics: any[] = [];

  variableFilterCtrl = new FormControl('', { nonNullable: true });
  filteredVariables: any[] = [];
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
      general_rule_days: [this.annotateTreatmentDefaults.general_rule_days],
      concomitant_start_gap: [this.annotateTreatmentDefaults.concomitant_start_gap],
      concomitant_end_gap: [this.annotateTreatmentDefaults.concomitant_end_gap],
      surgery_postop_radio_days: [this.annotateTreatmentDefaults.surgery_postop_radio_days],
      surgery_adjuvant_chemo_days: [this.annotateTreatmentDefaults.surgery_adjuvant_chemo_days],
      postop_radio_concomi_start_gap: [this.annotateTreatmentDefaults.postop_radio_concomi_start_gap],
      postop_radio_concomi_end_gap: [this.annotateTreatmentDefaults.postop_radio_concomi_end_gap],
      radio_adjuvant_chemo_days: [this.annotateTreatmentDefaults.radio_adjuvant_chemo_days],
      concomi_radio_adj_start_gap: [this.annotateTreatmentDefaults.concomi_radio_adj_start_gap],
      concomi_radio_adj_end_gap: [this.annotateTreatmentDefaults.concomi_radio_adj_end_gap],
      concomi_radio_adj_to_next: [this.annotateTreatmentDefaults.concomi_radio_adj_to_next],
      chemo_immuno_days: [this.annotateTreatmentDefaults.chemo_immuno_days],
      neoadj_chemo_to_radio: [this.annotateTreatmentDefaults.neoadj_chemo_to_radio],
      neoadj_chemo_to_surgery: [this.annotateTreatmentDefaults.neoadj_chemo_to_surgery],
      neoadj_concomi_to_phase: [this.annotateTreatmentDefaults.neoadj_concomi_to_phase],
      neoadj_concomi_chemo2_start_gap: [this.annotateTreatmentDefaults.neoadj_concomi_chemo2_start_gap],
      neoadj_concomi_chemo2_end_gap: [this.annotateTreatmentDefaults.neoadj_concomi_chemo2_end_gap],
      neoadj_concomi_adj_to_next: [this.annotateTreatmentDefaults.neoadj_concomi_adj_to_next],
      neoadj_radio_adj_chemo1_to_radio: [this.annotateTreatmentDefaults.neoadj_radio_adj_chemo1_to_radio],
      neoadj_radio_adj_chemo2_to_chemo: [this.annotateTreatmentDefaults.neoadj_radio_adj_chemo2_to_chemo],
      trueValueInput: [''],
      //description: [''],
      endDateMode: ['none'],          // 'none' | 'fixed' | 'variable'
      to_date: [null],
      to_date_column: [null],
    });

    this.filteredVariables = [...this.variables];

    this.variableFilterCtrl.valueChanges.subscribe(search => {
      this.filterVariables(search);
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
    this.onCategoryChange();

    // Suscribirse a cambios en column1 para actualizar valores únicos cuando es to_boolean o merge_categories
    this.form.get('column1')?.valueChanges.subscribe(() => {
      if (this.isToBoolean() || this.isMergeCategories()) {
        this.updateUniqueValuesForMergeCategories();
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
      outputColumn: '',
      prefixValue: category === 'annotate_treatments' ? this.annotateTreatmentDefaults.prefixValue : '',
      trueValueInput: '',
      endDateMode: 'none',
      to_date: null,
      to_date_column: null
    });

    if (category === 'annotate_treatments') {
      this.form.patchValue(this.annotateTreatmentDefaults);
    }

    // Resetear lista de trueValues y grupos de merge_categories
    this.trueValues = [];
    this.mergeCategoryGroups = [];
    this.availableUniqueValues = [];

    // Actualizar validadores según la categoría
    const column1Control = this.form.get('column1');
    const column2Control = this.form.get('column2');
    const operationControl = this.form.get('operation');
    const prefixControl = this.form.get('prefixValue');
    const outputColumnControl = this.form.get('outputColumn');

    // Todos necesitan column1
    column1Control?.setValidators([Validators.required]);


    // To Boolean: solo column y outputColumn, true_values en array
    if (category === 'to_boolean') {
      column2Control?.clearValidators();
      operationControl?.clearValidators();
      prefixControl?.clearValidators();
      outputColumnControl?.setValidators([Validators.required]);
    }
    // Annotate Treatments: solo prefix y parámetros numéricos
    else if (category === 'annotate_treatments') {
      column1Control?.clearValidators();
      column2Control?.clearValidators();
      operationControl?.clearValidators();
      outputColumnControl?.clearValidators();

      prefixControl?.setValidators([Validators.required]);
    }
    // Merge Categories: solo column y outputColumn, mapping requerido
    else if (category === 'merge_categories') {
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
    column1Control?.updateValueAndValidity();
  }

  /**
   * Retorna las variables disponibles para el primer campo según la categoría
   */
  getAvailableVariables(): VariableOption[] {
    const baseVariables = this.filteredVariables.length || this.variableFilterCtrl.value
      ? this.filteredVariables
      : this.variables;

    if (this.isComputedVariables()) {
      return baseVariables.filter(variable =>
        variable.datatype === 'Number' || variable.datatype === 'Float'
      );
    }

    if (
      this.isMergeVariables() ||
      this.isMergeCategories() ||
      this.isOneHotEncoding() ||
      this.isToBoolean()
    ) {
      return baseVariables.filter(variable =>
        variable.datatype === 'Categorical' || variable.datatype === 'Boolean'
      );
    }

    if (this.isTimeDelta()) {
      return baseVariables.filter(variable =>
        variable.datatype === 'Date'
      );
    }
    return baseVariables;

    const category = this.form.get('category')?.value;
    switch (category) {
      case 'merge_variables':
      case 'merge_categories':
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
   * Verifica si la categoría actual es merge_categories
   */
  isMergeCategories(): boolean {
    return this.form.get('category')?.value === 'merge_categories';
  }

  /**
   * Verifica si la categoría actual es to_boolean
   */
  isToBoolean(): boolean {
    return this.form.get('category')?.value === 'to_boolean';
  }

  isAnnotateTreatments(): boolean {
    return this.form.get('category')?.value === 'annotate_treatments';
  }

  /**
   * Agrega un grupo de categorías para merge_categories
   */
  addMergeCategoryGroup(): void {
    this.mergeCategoryGroups.push({
      groupName: '',
      categories: []
    });
  }

  /**
   * Elimina un grupo de categorías merge_categories
   */
  removeMergeCategoryGroup(index: number): void {
    this.mergeCategoryGroups.splice(index, 1);
  }

  /**
   * Actualiza el nombre de grupo para merge_categories
   */
  updateMergeCategoryName(index: number, name: string): void {
    if (this.mergeCategoryGroups[index]) {
      this.mergeCategoryGroups[index].groupName = name;
    }
  }

  /**
   * Actualiza las categorías mapeadas para un grupo merge_categories
   */
  updateMergeCategoryOptions(index: number, categories: string[]): void {
    if (this.mergeCategoryGroups[index]) {
      this.mergeCategoryGroups[index].categories = categories;
    }
  }

  /**
   * Actualiza la lista de valores únicos disponibles para la variable seleccionada
   */
  updateUniqueValuesForMergeCategories(): void {
    this.availableUniqueValues = [];
    const selectedVariableId = this.form.get('column1')?.value;

    if (!selectedVariableId || !this.summaryStatistics.length) {
      return;
    }

    const firstStat = this.summaryStatistics[0];
    const countsUniqueValues = firstStat?.rps_cohort?.counts_unique_values?.[selectedVariableId] || {};

    this.availableUniqueValues = Object.entries(countsUniqueValues)
      .map(([value, count]) => ({
        value,
        count: Number(count) || 0
      }))
      .filter(item => item.value !== 'N/A')
      .sort((a, b) => b.count - a.count);
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

  private readNumberControl(controlName: string, fallback: number): number {
    const rawValue = this.form.get(controlName)?.value;

    if (rawValue === null || rawValue === undefined || rawValue === '') {
      return fallback;
    }

    const parsedValue = Number(rawValue);
    return Number.isNaN(parsedValue) ? fallback : parsedValue;
  }

  private readStringControl(controlName: string, fallback: string): string {
    const rawValue = String(this.form.get(controlName)?.value ?? '').trim();
    return rawValue || fallback;
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
    const analysisId = Number(this.data?.analysis_id || 0);


    if (!dataframeId) {
      return;
    }

    const baseData = {
      dataframe_id: dataframeId,
      analysis_id: analysisId,
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
        const endDateMode = this.form.get('endDateMode')?.value;

        if (!timedeltaColumn || !outputColumn) return;

        let data: any = {
          ...baseData,
          column: timedeltaColumn,
          output_column: outputColumn
        };


        if (endDateMode === 'fixed') {
          const toDate = this.form.get('to_date')?.value;
          if (!toDate) return;
          data.to_date = toDate;

        } else if (endDateMode === 'variable') {
          const toVariable = this.form.get('to_date_column')?.value;
          if (!toVariable) return;
          data.to_date_column = toVariable;

        }

        result = {
          method: category,
          data
        };

        break;

      case 'merge_categories':
        // Merge Categories necesita column, output_column y mapping
        const mergeCategoriesColumn = this.form.get('column1')?.value;
        const mapping = this.mergeCategoryGroups.reduce((acc: any, group) => {
          if (group.groupName && group.categories.length > 0) {
            acc[group.groupName] = group.categories;
          }
          return acc;
        }, {});

        if (!mergeCategoriesColumn || !outputColumn || Object.keys(mapping).length === 0) return;

        result = {
          method: category,
          data: {
            ...baseData,
            column: mergeCategoriesColumn,
            output_column: outputColumn,
            mapping
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

      case 'annotate_treatments':
        result = {
          method: category,
          data: {
            analysis_id: analysisId,
            prefix: this.readStringControl('prefixValue', this.annotateTreatmentDefaults.prefixValue),
            general_rule_days: this.readNumberControl('general_rule_days', this.annotateTreatmentDefaults.general_rule_days),
            concomitant_start_gap: this.readNumberControl('concomitant_start_gap', this.annotateTreatmentDefaults.concomitant_start_gap),
            concomitant_end_gap: this.readNumberControl('concomitant_end_gap', this.annotateTreatmentDefaults.concomitant_end_gap),
            surgery_postop_radio_days: this.readNumberControl('surgery_postop_radio_days', this.annotateTreatmentDefaults.surgery_postop_radio_days),
            surgery_adjuvant_chemo_days: this.readNumberControl('surgery_adjuvant_chemo_days', this.annotateTreatmentDefaults.surgery_adjuvant_chemo_days),
            postop_radio_concomi_start_gap: this.readNumberControl('postop_radio_concomi_start_gap', this.annotateTreatmentDefaults.postop_radio_concomi_start_gap),
            postop_radio_concomi_end_gap: this.readNumberControl('postop_radio_concomi_end_gap', this.annotateTreatmentDefaults.postop_radio_concomi_end_gap),
            radio_adjuvant_chemo_days: this.readNumberControl('radio_adjuvant_chemo_days', this.annotateTreatmentDefaults.radio_adjuvant_chemo_days),
            concomi_radio_adj_start_gap: this.readNumberControl('concomi_radio_adj_start_gap', this.annotateTreatmentDefaults.concomi_radio_adj_start_gap),
            concomi_radio_adj_end_gap: this.readNumberControl('concomi_radio_adj_end_gap', this.annotateTreatmentDefaults.concomi_radio_adj_end_gap),
            concomi_radio_adj_to_next: this.readNumberControl('concomi_radio_adj_to_next', this.annotateTreatmentDefaults.concomi_radio_adj_to_next),
            chemo_immuno_days: this.readNumberControl('chemo_immuno_days', this.annotateTreatmentDefaults.chemo_immuno_days),
            neoadj_chemo_to_radio: this.readNumberControl('neoadj_chemo_to_radio', this.annotateTreatmentDefaults.neoadj_chemo_to_radio),
            neoadj_chemo_to_surgery: this.readNumberControl('neoadj_chemo_to_surgery', this.annotateTreatmentDefaults.neoadj_chemo_to_surgery),
            neoadj_concomi_to_phase: this.readNumberControl('neoadj_concomi_to_phase', this.annotateTreatmentDefaults.neoadj_concomi_to_phase),
            neoadj_concomi_chemo2_start_gap: this.readNumberControl('neoadj_concomi_chemo2_start_gap', this.annotateTreatmentDefaults.neoadj_concomi_chemo2_start_gap),
            neoadj_concomi_chemo2_end_gap: this.readNumberControl('neoadj_concomi_chemo2_end_gap', this.annotateTreatmentDefaults.neoadj_concomi_chemo2_end_gap),
            neoadj_concomi_adj_to_next: this.readNumberControl('neoadj_concomi_adj_to_next', this.annotateTreatmentDefaults.neoadj_concomi_adj_to_next),
            neoadj_radio_adj_chemo1_to_radio: this.readNumberControl('neoadj_radio_adj_chemo1_to_radio', this.annotateTreatmentDefaults.neoadj_radio_adj_chemo1_to_radio),
            neoadj_radio_adj_chemo2_to_chemo: this.readNumberControl('neoadj_radio_adj_chemo2_to_chemo', this.annotateTreatmentDefaults.neoadj_radio_adj_chemo2_to_chemo)
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

  filterVariables(search: string): void {
    const filterValue = (search || '').toLowerCase().trim();

    if (!filterValue) {
      this.filteredVariables = [...this.variables];
      return;
    }

    this.filteredVariables = this.variables.filter(variable => {
      const variableName = String(variable.variable_name || '').toLowerCase();
      const displayName = String(variable.display_name || '').toLowerCase();

      return (
        variableName.includes(filterValue) ||
        displayName.includes(filterValue)
      );
    });
  }
}