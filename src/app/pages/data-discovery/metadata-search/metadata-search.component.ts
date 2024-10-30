import { Component } from '@angular/core';
import {FormBuilder, Validators, FormsModule, ReactiveFormsModule} from '@angular/forms';

@Component({
  selector: 'app-metadata-search',
  templateUrl: './metadata-search.component.html',
  styleUrl: './metadata-search.component.scss'
})
export class MetadataSearchComponent {

   //  Cancer type form
   cancer_type = this._formBuilder.group({
    hnc: false,
    sarcoma: false,
  });

  firstFormGroup = this._formBuilder.group({
    firstCtrl: ['', Validators.required],
  });
  secondFormGroup = this._formBuilder.group({
    secondCtrl: ['', Validators.required],
  });
  isLinear = false;

  constructor(private _formBuilder: FormBuilder) {}

}
