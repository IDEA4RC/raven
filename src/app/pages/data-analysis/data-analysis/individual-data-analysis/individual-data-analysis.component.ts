import { AfterViewInit, Component, inject, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, Validators } from '@angular/forms';
import { StepperSelectionEvent } from '@angular/cdk/stepper';
import { MatStepper } from '@angular/material/stepper';
import { Subject, takeUntil } from 'rxjs';
import { SelectionService } from './selection.service';

type AnalysisView = 'algorithms' | 'new-algorithm' | 'algorithm-results' | null;

@Component({
  selector: 'app-individual-data-analysis',
  templateUrl: './individual-data-analysis.component.html',
  styleUrl: './individual-data-analysis.component.scss'
})
export class IndividualDataAnalysisComponent
  implements OnInit, AfterViewInit, OnDestroy {

  @ViewChild('stepper') stepper!: MatStepper;

  analysisId: number | null = null;
  checkingSummary = false;
  private activeCohortSignature = '';
  private readonly formBuilder = inject(FormBuilder);
  private readonly destroy$ = new Subject<void>();

  private requestedView: AnalysisView = null;
  private requestedAlgorithmId: number | null = null;
  private stepperInitialized = false;
  private restoringFromUrl = false;

  cohortSelectionFormGroup = this.formBuilder.group({
    completed: [false, Validators.requiredTrue]
  });

  dataPreparationFormGroup = this.formBuilder.group({
    completed: [false, Validators.requiredTrue]
  });

  analyticSelectionFormGroup = this.formBuilder.group({
    completed: [false, Validators.requiredTrue]
  });

  analysisResultsFormGroup = this.formBuilder.group({});

  constructor(
    private activatedRoute: ActivatedRoute,
    private router: Router,
    private selectionService: SelectionService
  ) { }

  ngOnInit(): void {
    const analysisId = Number(this.activatedRoute.snapshot.paramMap.get('analysisId'));

    if (!Number.isFinite(analysisId) || analysisId <= 0) {
      console.error('Invalid analysis ID.');
      return;
    }

    this.analysisId = analysisId;
    this.selectionService.initializeAnalysis(analysisId);

    this.activeCohortSignature = this.selectionService.getSelectedCohortSignature();

    this.selectionService.selectedItems$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        const newSignature = this.selectionService.getSelectedCohortSignature();

        if (newSignature === this.activeCohortSignature) {
          return;
        }

        this.activeCohortSignature = newSignature;
        this.invalidateStepsAfterCohortChange();
      });

    this.activatedRoute.queryParamMap
      .pipe(takeUntil(this.destroy$))
      .subscribe(queryParams => {
        this.requestedView = this.parseView(queryParams.get('view'));

        const algorithmId = Number(queryParams.get('algorithmId'));
        this.requestedAlgorithmId =
          Number.isFinite(algorithmId) && algorithmId > 0 ? algorithmId : null;

        if (this.stepperInitialized) {
          this.restoreViewFromUrl();
        }
      });
  }

  ngAfterViewInit(): void {
    this.stepperInitialized = true;

    queueMicrotask(() => {
      this.restoreViewFromUrl();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private invalidateStepsAfterCohortChange(): void {
    this.selectionService.clearSelectedAlgorithm();

    this.dataPreparationFormGroup.controls.completed.setValue(false);
    this.analyticSelectionFormGroup.controls.completed.setValue(false);

    this.updateUrl(null);

    if (this.stepperInitialized && this.stepper.selectedIndex !== 0) {
      this.navigateToStep(0);
    }
  }

  goToNextStep(): void {
    if (!this.stepper) {
      return;
    }

    switch (this.stepper.selectedIndex) {
      case 0:
        this.completeCohortSelection();
        break;

      case 1:
        this.dataPreparationFormGroup.controls.completed.setValue(true);
        this.navigateToStep(2);
        this.updateUrl('algorithms');
        break;

      case 2:
        if (!this.selectionService.getSelectedAlgorithm()) {
          return;
        }

        this.analyticSelectionFormGroup.controls.completed.setValue(true);
        this.navigateToStep(3);
        break;
    }
  }

  goToPreviousStep(): void {
    if (!this.stepper || this.stepper.selectedIndex === 0) {
      return;
    }

    if (this.stepper.selectedIndex === 3) {
      this.selectionService.clearSelectedAlgorithm();
      this.analyticSelectionFormGroup.controls.completed.setValue(false);
      this.updateUrl('algorithms');
      this.navigateToStep(2);
      return;
    }

    if (this.stepper.selectedIndex === 2) {
      this.updateUrl(null);
      this.navigateToStep(1);
      return;
    }

    this.navigateToStep(this.stepper.selectedIndex - 1);
  }

  onStepSelectionChange(event: StepperSelectionEvent): void {
    if (this.restoringFromUrl) {
      return;
    }

    if (event.selectedIndex < 2) {
      this.selectionService.clearSelectedAlgorithm();
      this.updateUrl(null);
      return;
    }

    if (event.selectedIndex === 2) {
      this.selectionService.clearSelectedAlgorithm();
      this.analyticSelectionFormGroup.controls.completed.setValue(false);
      this.updateUrl('algorithms');
    }
  }

  private completeCohortSelection(): void {
    const selectedCohorts = this.selectionService.getSelected();

    if (!selectedCohorts.length) {
      this.cohortSelectionFormGroup.controls.completed.setValue(false);
      return;
    }

    this.cohortSelectionFormGroup.controls.completed.setValue(true);
    this.navigateToStep(1);
  }

  private restoreViewFromUrl(): void {
    if (!this.stepper) {
      return;
    }

    const selectedCohorts = this.selectionService.getSelected();

    if (!selectedCohorts.length) {
      this.resetStepCompletion();
      this.navigateToStep(0);
      return;
    }

    this.cohortSelectionFormGroup.controls.completed.setValue(true);

    if (
      this.requestedView === 'algorithms' ||
      this.requestedView === 'new-algorithm'
    ) {
      this.dataPreparationFormGroup.controls.completed.setValue(true);
      this.analyticSelectionFormGroup.controls.completed.setValue(false);
      this.navigateToStep(2);
      return;
    }

    if (this.requestedView === 'algorithm-results') {
      this.dataPreparationFormGroup.controls.completed.setValue(true);

      const selectedAlgorithm = this.selectionService.getSelectedAlgorithm();
      const selectedAlgorithmId = Number(selectedAlgorithm?.id ?? 0);

      if (
        selectedAlgorithm &&
        selectedAlgorithmId === this.requestedAlgorithmId
      ) {
        this.analyticSelectionFormGroup.controls.completed.setValue(true);
        this.navigateToStep(3);
      } else {
        /*
         * AnalyticSelectionComponent will load the algorithm from the list
         * and emit nextStep once it has been restored.
         */
        this.analyticSelectionFormGroup.controls.completed.setValue(false);
        this.navigateToStep(2);
      }

      return;
    }

    this.navigateToStep(0);
  }

  private navigateToStep(targetIndex: number): void {
    if (!this.stepper) {
      return;
    }

    const boundedIndex = Math.max(0, Math.min(
      targetIndex,
      this.stepper.steps.length - 1
    ));

    this.restoringFromUrl = true;

    const previousLinearValue = this.stepper.linear;
    this.stepper.linear = false;
    this.stepper.selectedIndex = boundedIndex;
    this.stepper.linear = previousLinearValue;

    queueMicrotask(() => {
      this.restoringFromUrl = false;
    });
  }

  private updateUrl(view: AnalysisView, algorithmId?: number): void {
    this.router.navigate([], {
      relativeTo: this.activatedRoute,
      queryParams: {
        view,
        algorithmId: algorithmId ?? null
      },
      queryParamsHandling: 'merge',
      replaceUrl: true
    });
  }

  private parseView(value: string | null): AnalysisView {
    if (
      value === 'algorithms' ||
      value === 'new-algorithm' ||
      value === 'algorithm-results'
    ) {
      return value;
    }

    return null;
  }

  private resetStepCompletion(): void {
    this.cohortSelectionFormGroup.controls.completed.setValue(false);
    this.dataPreparationFormGroup.controls.completed.setValue(false);
    this.analyticSelectionFormGroup.controls.completed.setValue(false);
  }
}