import { Component, EventEmitter, OnDestroy, OnInit, Output, ViewChild } from '@angular/core';
import { Observable } from 'rxjs';
import { DataAnalysisService } from '../data-analysis/data-analysis.service';
import { Router } from '@angular/router';
@Component({
  selector: 'app-data-preparation',
  templateUrl: './data-preparation.component.html',
  styleUrl: './data-preparation.component.scss'
})
export class DataPreparationComponent implements OnInit, OnDestroy {
  
  @Output() nextStep = new EventEmitter<void>();
  @Output() previousStep = new EventEmitter<void>();

  // Variable to store the current workspace ID from the route
  workspaceId: string | undefined;
  analysisId: string | undefined;

  // Observables cohort
  observable_data_preparation$ : Observable<any> | undefined;
  private dataPreparationSubscription: any;

  constructor(
      private dataAnalysisService: DataAnalysisService,
      private router: Router
  ) { }

  ngOnInit(): void {
    // Extract workspace ID from the current URL
    const urlSegments = this.router.url.split('/');
    const workspaceIndex = urlSegments.indexOf('workspace');    
    
    if (workspaceIndex !== -1 && urlSegments.length > workspaceIndex + 1) {
      this.workspaceId = urlSegments[workspaceIndex + 1];
    }
  }

  ngOnDestroy(): void {
    // Unsubscribe from the observable to prevent memory leaks
    if (this.dataPreparationSubscription) {
      this.dataPreparationSubscription.unsubscribe();
    }
  }
  
  goBack() {
    this.previousStep.emit();
  }
  goNext() {
    this.nextStep.emit();
  }

}
