import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SelectionService {
  private analysisId: number | null = null;

  private readonly selectedCohortsSubject = new BehaviorSubject<any[]>([]);
  private readonly selectedAlgorithmSubject = new BehaviorSubject<any | null>(null);

  selectedItems$: Observable<any[]> = this.selectedCohortsSubject.asObservable();
  selectedAlgorithm$: Observable<any | null> =
    this.selectedAlgorithmSubject.asObservable();

  initializeAnalysis(analysisId: number): void {
    if (this.analysisId === analysisId) {
      return;
    }

    this.analysisId = analysisId;

    const cohorts = this.readSessionValue<any[]>(this.getCohortsStorageKey(), []);
    const algorithm = this.readSessionValue<any | null>(
      this.getAlgorithmStorageKey(),
      null
    );

    this.selectedCohortsSubject.next(Array.isArray(cohorts) ? cohorts : []);

    if (algorithm && this.algorithmMatchesCohorts(algorithm, cohorts)) {
      this.selectedAlgorithmSubject.next(algorithm);
    } else {
      this.selectedAlgorithmSubject.next(null);
      this.removeSessionValue(this.getAlgorithmStorageKey());
    }
  }

  setSelected(items: any[]): void {
    const previousCohorts = this.selectedCohortsSubject.getValue();
    const newCohorts = Array.isArray(items) ? items : [];

    const previousSignature = this.getCohortSignature(previousCohorts);
    const newSignature = this.getCohortSignature(newCohorts);

    this.selectedCohortsSubject.next(newCohorts);
    this.writeSessionValue(this.getCohortsStorageKey(), newCohorts);

    if (previousSignature !== newSignature) {
      this.clearSelectedAlgorithm();
    }
  }

  getSelected(): any[] {
    return this.selectedCohortsSubject.getValue();
  }

  setSelectedAlgorithm(algorithm: any | null): void {
    if (algorithm && !this.algorithmMatchesCohorts(algorithm, this.getSelected())) {
      console.error('The selected algorithm does not belong to the active cohorts.');
      return;
    }

    this.selectedAlgorithmSubject.next(algorithm);

    if (algorithm) {
      this.writeSessionValue(this.getAlgorithmStorageKey(), algorithm);
    } else {
      this.removeSessionValue(this.getAlgorithmStorageKey());
    }
  }

  getSelectedAlgorithm(): any | null {
    return this.selectedAlgorithmSubject.getValue();
  }

  clearSelectedAlgorithm(): void {
    this.selectedAlgorithmSubject.next(null);
    this.removeSessionValue(this.getAlgorithmStorageKey());
  }

  getSelectedCohortSignature(): string {
    return this.getCohortSignature(this.getSelected());
  }

  private algorithmMatchesCohorts(algorithm: any, cohorts: any[]): boolean {
    const algorithmCohorts = Array.isArray(algorithm?.cohorts)
      ? algorithm.cohorts
      : [];

    return this.getCohortSignature(algorithmCohorts) ===
      this.getCohortSignature(cohorts);
  }

  private getCohortSignature(cohorts: any[]): string {
    return (cohorts || [])
      .map(cohort => String(cohort?.id ?? ''))
      .filter(Boolean)
      .sort()
      .join('|');
  }

  private getCohortsStorageKey(): string {
    return `data-analysis:${this.analysisId}:selected-cohorts`;
  }

  private getAlgorithmStorageKey(): string {
    return `data-analysis:${this.analysisId}:selected-algorithm`;
  }

  private readSessionValue<T>(key: string, fallback: T): T {
    if (this.analysisId === null) {
      return fallback;
    }

    try {
      const value = sessionStorage.getItem(key);
      return value ? JSON.parse(value) as T : fallback;
    } catch (error) {
      console.error(`Error reading session state "${key}":`, error);
      return fallback;
    }
  }

  private writeSessionValue(key: string, value: unknown): void {
    if (this.analysisId === null) {
      return;
    }

    try {
      sessionStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error(`Error saving session state "${key}":`, error);
    }
  }

  private removeSessionValue(key: string): void {
    if (this.analysisId === null) {
      return;
    }

    try {
      sessionStorage.removeItem(key);
    } catch (error) {
      console.error(`Error removing session state "${key}":`, error);
    }
  }
}