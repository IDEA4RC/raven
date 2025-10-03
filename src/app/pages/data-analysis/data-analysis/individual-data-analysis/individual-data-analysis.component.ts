import { Component, inject, Input, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable } from 'rxjs';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { FormBuilder, FormControl, Validators } from '@angular/forms';
import { DataAnalysisService } from '../data-analysis.service';

@Component({
  selector: 'app-individual-data-analysis',
  templateUrl: './individual-data-analysis.component.html',
  styleUrl: './individual-data-analysis.component.scss'
})
export class IndividualDataAnalysisComponent implements OnInit {
  
  // private _activatedRoute = inject(ActivatedRoute);
  analysisId: number | null = null;

  constructor(
        private snackBar: MatSnackBar,
        private dataAnalysisService: DataAnalysisService,
        private router: Router,
        private dialogModel: MatDialog) { }

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
    // this._activatedRoute.params.subscribe(params => {
    //   const analysisId = +params['id']; // Convert to number with +
    //   if (analysisId) {
    //     this.analysisId = analysisId;
    //   }
    // });
    
  }
}
