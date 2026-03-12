import { Component, inject, Input, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable } from 'rxjs';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { FormBuilder, FormControl, Validators } from '@angular/forms';
import { DataAnalysisService } from '../data-analysis.service';
import { MatStepper } from '@angular/material/stepper';
import { SelectionService } from './selection.service';

@Component({
  selector: 'app-individual-data-analysis',
  templateUrl: './individual-data-analysis.component.html',
  styleUrl: './individual-data-analysis.component.scss'
})
export class IndividualDataAnalysisComponent implements OnInit {

  @ViewChild('stepper') stepper!: MatStepper;


  // private _activatedRoute = inject(ActivatedRoute);
  analysisId: number | null = null;
  checkingSummary = false;

  constructor(
    private snackBar: MatSnackBar,
    private dataAnalysisService: DataAnalysisService,
    private selectionService: SelectionService,
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

  // Method called from child components
  goToNextStep(): void {
   /* if (this.checkingSummary) {
      return;
    }

    // Check only when moving from step 1 to step 2.
    if (this.stepper.selectedIndex === 0) {
      this.goToNextStepWithSummaryCheck();
      return;
    }
*/
    this.stepper.next();
  }

  private goToNextStepWithSummaryCheck(): void {
    const selectedCohorts = this.selectionService.getSelected() || [];
    const cohortIds = selectedCohorts
      .map((cohort: any) => cohort?.id)
      .filter((cohortId: unknown) => cohortId !== null && cohortId !== undefined);

    if (cohortIds.length === 0) {
      this.navigateToStep(this.stepper.selectedIndex + 1);
      return;
    }

    this.checkingSummary = true;
    const body = { cohort_ids: cohortIds };

    this.dataAnalysisService.existsSummaryByCohort(body).subscribe({
      next: (result: any) => {
        console.log("result existSummary", result);

        const summaries = Array.isArray(result)
          ? result
          : (Array.isArray(result?.summaries)
            ? result.summaries
            : (Array.isArray(result?.algorithms)
              ? result.algorithms
              : (result?.exists === true ? [result] : [])));

        if (summaries.length > 0) {
          // Skip one step when a summary already exists.
          const nextIndex = this.stepper.selectedIndex + 2;
          console.log("nextIndex", nextIndex);

          this.navigateToStep(nextIndex);
        } else {
          this.navigateToStep(this.stepper.selectedIndex + 1);
        }

        this.checkingSummary = false;
      },
      error: (err) => {
        console.error('Error checking existing summaries:', err);
        this.checkingSummary = false;
        // Fallback to Data Preparation on errors.
        this.navigateToStep(this.stepper.selectedIndex + 1);
      }
    });
  }

  private navigateToStep(targetIndex: number): void {
    if (!this.stepper) {
      return;
    }

    const boundedIndex = Math.max(0, Math.min(targetIndex, this.stepper.steps.length - 1));
    const previousLinear = this.stepper.linear;

    // Force the navigation first, then restore linear behavior.
    this.stepper.linear = false;
    this.stepper.selectedIndex = boundedIndex;
    this.stepper.linear = previousLinear;
  }

  goToPreviousStep(): void {
    this.stepper.previous();
  }
}
