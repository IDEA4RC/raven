import { Component, ElementRef, OnInit, QueryList, ViewChild, ViewChildren, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

import { ResultReportService, ResultReport, AvailableAlgorithm } from '../result-report.service';
import {
  AnalysisResultsComponent,
  SelectedAlgorithm,
} from '../../data-analysis/data-analysis/individual-data-analysis/analysis-results/analysis-results.component';

@Component({
  selector: 'app-result-report',
  templateUrl: './result-report.component.html',
  styleUrl: './result-report.component.scss',
})
export class ResultReportComponent implements OnInit {
  private activatedRoute = inject(ActivatedRoute);
  private sanitizer = inject(DomSanitizer);

  workspaceId: number | null = null;
  report: ResultReport | null = null;
  availableAlgorithms: AvailableAlgorithm[] = [];
  expandedAlgorithmId: number | null = null;
  loading = true;

  // Step 2 - Final Report Creation
  step: 1 | 2 = 1;
  generating = false;
  pdfBlob: Blob | null = null;
  pdfPreviewUrl: SafeResourceUrl | null = null;
  @ViewChild('printableContainer') printableContainer?: ElementRef<HTMLElement>;
  @ViewChildren('arRef') analysisResultsRefs?: QueryList<AnalysisResultsComponent>;

  constructor(private resultReportService: ResultReportService) {}

  ngOnInit(): void {
    this.activatedRoute.params.subscribe((params) => {
      const workspaceId = +params['id'];
      if (workspaceId) {
        this.workspaceId = workspaceId;
        this.loadReport();
        this.loadAvailableAlgorithms();
      }
    });
  }

  loadReport(): void {
    if (!this.workspaceId) return;
    this.loading = true;
    this.resultReportService.getReport(this.workspaceId).subscribe({
      next: (report) => {
        this.report = report;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      },
    });
  }

  loadAvailableAlgorithms(): void {
    if (!this.workspaceId) return;
    this.resultReportService.getAvailableAlgorithms(this.workspaceId).subscribe({
      next: (algorithms) => {
        this.availableAlgorithms = algorithms;
      },
    });
  }

  /** Persists a single text field on blur (partial update). */
  saveField(field: keyof ResultReport): void {
    if (!this.workspaceId || !this.report) return;
    const value = this.report[field];
    this.resultReportService
      .updateReport(this.workspaceId, { [field]: value } as Partial<ResultReport>)
      .subscribe();
  }

  isSelected(algorithmId: number): boolean {
    return !!this.report?.algorithm_ids?.includes(algorithmId);
  }

  toggleAlgorithm(algorithmId: number): void {
    if (!this.report || !this.workspaceId) return;
    const current = this.report.algorithm_ids || [];
    const next = this.isSelected(algorithmId)
      ? current.filter((id) => id !== algorithmId)
      : [...current, algorithmId];
    this.report.algorithm_ids = next;
    this.resultReportService
      .updateReport(this.workspaceId, { algorithm_ids: next })
      .subscribe();
  }

  toggleExpand(algorithm: AvailableAlgorithm): void {
    this.expandedAlgorithmId = this.expandedAlgorithmId === algorithm.id ? null : algorithm.id;
  }

  /**
   * Maps the lightweight AvailableAlgorithm (from the Result Report selection
   * checklist) into the shape AnalysisResultsComponent expects, so the same
   * per-algorithm-type rendering (tables/charts) used in Data Analysis can be
   * reused here via [algorithmOverride].
   * Note: `cohorts` (full Cohort objects) isn't available from this endpoint,
   * so cohort-name mapping inside AnalysisResultsComponent falls back to raw
   * Vantage6 names for now.
   */
  toSelectedAlgorithm(algorithm: AvailableAlgorithm): SelectedAlgorithm {
    return {
      id: algorithm.id,
      method_name: algorithm.method_name,
      description: algorithm.description,
      input: algorithm.input,
      col_var: algorithm.col_var,
      row_var_list: algorithm.row_var_list,
      task_id: algorithm.task_id,
      creation_date: algorithm.creation_date,
      status_task: algorithm.status_task,
      cohort_ids: algorithm.cohort_ids,
      cohorts: [],
    };
  }

  selectedAlgorithms(): AvailableAlgorithm[] {
    return this.availableAlgorithms.filter((a) => this.isSelected(a.id));
  }

  goToStep2(): void {
    this.step = 2;
    this.pdfBlob = null;
    this.pdfPreviewUrl = null;
  }

  goToStep1(): void {
    this.step = 1;
  }

  /**
   * Builds the printable HTML for all selected analyses (tables + chart
   * images) and sends it to the backend to be converted to PDF.
   * Charts are Chart.js <canvas> elements: canvases render nothing when
   * serialized as HTML, so each one is replaced with a <img> built from
   * its own toDataURL() on a cloned copy of the DOM before capturing it.
   */
  generateReport(): void {
    if (!this.workspaceId || !this.printableContainer) return;
    this.generating = true;
    this.waitForResultsThenCapture();
  }

  /**
   * Each embedded analysis starts fetching its Vantage6 result as soon as
   * it's created (i.e. as soon as this page enters step 2) - possibly well
   * before the user clicks "Generate" - so readiness is checked as current
   * state (resultReady) rather than waiting on an event that may already
   * have fired. Poll until every instance reports ready (capped, so a stuck
   * request can't hang Generate forever) before capturing.
   */
  private waitForResultsThenCapture(elapsedMs = 0): void {
    const maxWaitMs = 20000;
    const pollIntervalMs = 300;
    const refs = this.analysisResultsRefs?.toArray() ?? [];
    const allReady = refs.length > 0 && refs.every((ref) => ref.resultReady);
    if (allReady || elapsedMs >= maxWaitMs) {
      this.captureAndSendPdf();
      return;
    }
    setTimeout(() => this.waitForResultsThenCapture(elapsedMs + pollIntervalMs), pollIntervalMs);
  }

  private captureAndSendPdf(): void {
    // Give Chart.js a moment to finish painting the canvases before
    // capturing (data has already loaded - printableContainer's embedded
    // analyses render in printMode, which shows every section at once,
    // so no tab-switching is needed here).
    setTimeout(() => {
      const original = this.printableContainer!.nativeElement;
      const clone = original.cloneNode(true) as HTMLElement;

      const originalCanvases = original.querySelectorAll('canvas');
      const cloneCanvases = clone.querySelectorAll('canvas');
      originalCanvases.forEach((canvas, i) => {
        const img = document.createElement('img');
        img.src = (canvas as HTMLCanvasElement).toDataURL('image/png');
        img.style.maxWidth = '100%';
        cloneCanvases[i]?.replaceWith(img);
      });

      // Interactive controls (Download CSV, Download PNG, Back) have no
      // function in a static PDF - strip them from the capture.
      clone.querySelectorAll('button').forEach((button) => button.remove());

      const html = clone.innerHTML;

      this.resultReportService.generatePdf(this.workspaceId!, html).subscribe({
        next: (blob) => {
          this.pdfBlob = blob;
          const url = URL.createObjectURL(blob);
          this.pdfPreviewUrl = this.sanitizer.bypassSecurityTrustResourceUrl(url);
          this.generating = false;
        },
        error: () => {
          this.generating = false;
        },
      });
    }, 500);
  }

  downloadPdf(): void {
    if (!this.pdfBlob) return;
    const url = URL.createObjectURL(this.pdfBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'result_report.pdf';
    link.click();
  }

  printPdf(): void {
    if (!this.pdfBlob) return;
    const url = URL.createObjectURL(this.pdfBlob);
    window.open(url, '_blank');
  }
}
