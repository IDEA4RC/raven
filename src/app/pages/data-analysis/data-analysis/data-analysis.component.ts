import { Component, inject, OnInit } from '@angular/core';
import { FormBuilder, FormControl, Validators } from '@angular/forms';

@Component({
  selector: 'app-data-analysis',
  templateUrl: './data-analysis.component.html',
  styleUrl: './data-analysis.component.scss'
})
export class DataAnalysisComponent implements OnInit {
  


  // Form groups
  private _formBuilder = inject(FormBuilder);
  readonly firstCtrl = new FormControl('', Validators.required);

cohortSelectionFormGroup = this._formBuilder.group({
    // firstCtrl: this.firstCtrl,
});
dataQualityFormGroup = this._formBuilder.group({
  // firstCtrl: this.firstCtrl,
});
dataPreparationFormGroup = this._formBuilder.group({
  // firstCtrl: this.firstCtrl,
});
analyticSelectionFormGroup = this._formBuilder.group({
  // firstCtrl: this.firstCtrl,
});
analysisResultsFormGroup = this._formBuilder.group({
  // firstCtrl: this.firstCtrl,
});

  ngOnInit(): void {
    
  }
}
