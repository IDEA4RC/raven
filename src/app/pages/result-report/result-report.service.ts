import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ResultReport {
  id: number;
  workspace_id: number;
  title?: string;
  background?: string;
  objective?: string;
  hypothesis?: string;
  team?: string;
  funding?: string;
  conflicts_of_interest?: string;
  protocol?: string;
  registration?: string;
  data_sharing?: string;
  data_sources?: string;
  metadata_description?: string;
  cohorts_selection?: string;
  data_preparation?: string;
  analysis_overview?: string;
  study_results?: string;
  limitations?: string;
  future_works?: string;
  algorithm_ids: number[];
  created_at: string;
  updated_at: string;
}

export interface AvailableAlgorithm {
  id: number;
  method_name: string;
  description?: string;
  creation_date: string;
  cohort_names: string[];
  cohort_ids: number[];
  task_id?: number;
  status_task?: string;
  input?: string;
  col_var?: string;
  row_var_list?: string;
}

@Injectable({
  providedIn: 'root',
})
export class ResultReportService {
  constructor(private httpClient: HttpClient) {}

  /**
   * Get the Result Report for a workspace (auto-created server-side if missing).
   */
  getReport(workspaceId: number): Observable<ResultReport> {
    const url = `/raven-api/v1/result-report/${workspaceId}`;
    return this.httpClient.get<ResultReport>(url);
  }

  /**
   * Update text sections and/or the selected algorithm_ids for the report.
   * Only fields present in `data` are updated.
   */
  updateReport(workspaceId: number, data: Partial<ResultReport>): Observable<ResultReport> {
    const url = `/raven-api/v1/result-report/${workspaceId}`;
    return this.httpClient.put<ResultReport>(url, data);
  }

  /**
   * List the algorithms executed in this workspace, available to select for
   * the report.
   */
  getAvailableAlgorithms(workspaceId: number): Observable<AvailableAlgorithm[]> {
    const url = `/raven-api/v1/result-report/${workspaceId}/available-algorithms`;
    return this.httpClient.get<AvailableAlgorithm[]>(url);
  }

  /**
   * Generate the final report PDF. `html` is the analyses' results section
   * (tables + chart images), built client-side; the backend wraps it with
   * the report's text sections and converts everything to PDF.
   */
  generatePdf(workspaceId: number, html: string): Observable<Blob> {
    const url = `/raven-api/v1/result-report/${workspaceId}/generate-pdf`;
    return this.httpClient.post(url, { html }, { responseType: 'blob' });
  }
}
