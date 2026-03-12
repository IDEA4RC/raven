import { Injectable } from "@angular/core";
import { forkJoin, Observable, of, Subject } from "rxjs";
import { HttpClient } from "@angular/common/http";

@Injectable({
  providedIn: 'root'
})
export class DataAnalysisService {

  // analysis Selection observables
  analysis = new Subject<any>();
  analysis$ = this.analysis.asObservable();


  // Cohort Selection observables
  cohort = new Subject<any>();
  cohort$ = this.cohort.asObservable();

  // Permit Selection observables
  permit = new Subject<any>();
  permit$ = this.permit.asObservable();

  //Data preparation observables (summary statistics, variables, etc)
  data_preparation_center = new Subject<any>();
  data_preparation_center$ = this.data_preparation_center.asObservable();
  data_preparation_cohort = new Subject<any>();
  data_preparation_cohort$ = this.data_preparation_cohort.asObservable();

  data_summary_statistics = new Subject<any>();
  data_summary_statistics$ = this.data_summary_statistics.asObservable();

  // Algorithm Selection observables
  algorithm = new Subject<any>();
  algorithm$ = this.algorithm.asObservable();

  constructor(private httpClient: HttpClient) { }

  /**
   * Function to get analysis of a workspace
   * @returns the list of analysis
   */
  getAnalysis(workspace_id: number) {
    const url = `/raven-api/v1/analyses//workspace/${workspace_id}`;
    // const url = './assets/jsons/analysis.json';
    this.getRequest(url).subscribe((data) => {
      this.analysis.next(data);
    });
  }
  /** //TODO
   * Method to create an analysis
   * @param data the data of the analysis to create
   * @returns 
   */
  createAnalysis(data: any) {
    // const url = `${environment.base_url}${environment.raven_url}/analysis/`;
    const url = '/raven-api/v1/analyses/create_analysis';
    return this.postRequest(url, data);
  }

  /** //TODO
   * Method to delete an analysis
   * @param analysis_id the id of the analysis to delete
   * @returns 
   */
  deleteAnalysis(analysis_id: any) {
    // const url = `${environment.base_url}${environment.raven_url}/analysis/${analysis_id}/`;
    const url = `/raven-api/v1/analyses/${analysis_id}`;
    return this.deleteRequest(url);
  }


  /**
   * Function to get cohorts of a workspace
   * @returns the list of cohorts
   */
  getCohorts(analysis_id: number) {
    const url = `/raven-api/v1/cohorts/analysis/${analysis_id}`;
    // const url = './assets/jsons/cohort.json';
    this.getRequest(url).subscribe((data) => {
      this.cohort.next(data);
    });
  }

  /** // TODO change url
   * Function to execute a query for a cohort (V6), it creates the dataframe in v6
   * @param cohortId id of the cohort
   * @returns 
   */
  executeQueryV6(cohortId: number) {
    const url = `/raven-api/v1/cohorts/analysis/${cohortId}`;
    return this.postRequest(url);
  }

  /**
   * Function to get permit by workspace id
   * @param workspace_id the workspace id
   * @returns the permit of the workspace
   */
  getPermitByWorkspaceId(workspace_id: string) {
    const url = `/raven-api/v1/permits/workspace/${workspace_id}`;

    this.getRequest(url).subscribe((data) => {
      this.permit.next(data);
    });
  }



  /**
   * Function to get coEs granted for a workspace from the permit
   * @param workspace_id the workspace id
   * @returns the coEs granted
   */
  getMetadataByWorkspace(workspace_id: number) {
    const url = `/raven-api/v1/metadata/workspace/${workspace_id}`;
    return this.getRequest(url)
  }

  /**
   * Function to get coEs granted and variables for a workspace from the permit
   * @param workspace_id the workspace id
   * @returns the coEs granted
   */
  getDataPermitByWorkspace(workspace_id: number) {
    const url = `/raven-api/v1/permits/workspace/${workspace_id}`;
    return this.getRequest(url)
  }

  /** // TODO this function will be replaced by getSummaryStatistics
   * Function to get summary statistics for data preparation by center
   * @param data list of centers
   * @returns the summary statistics by center
   */
  getSummaryStatisticsCenter(data: string[]) {
    const url = './assets/jsons/summary_statistics_center.json';
    this.getRequest(url).subscribe((data) => {
      this.data_preparation_center.next(data);
    });
  }

  /**
   * Function to get coEs granted and variables for a workspace from the permit
   * @param workspace_id the workspace id
   * @returns the coEs granted
   */
  getSummaryStatisticsV6(data: any) {
    console.log("GET SUMMARY");
    console.log(data);

    const url = `/raven-api/v1/data-preparation/create_summary`;
    return this.postRequest(url, data)
  }

  getTaskStatus(task_id: number) {
    const url = `/raven-api/v1/data-preparation/status_task/${task_id}`;
    return this.getRequest(url)
  }


  getTaskResult(task_id: number) {
    const url = `/raven-api/v1/data-preparation/result_task/${task_id}`;
    return this.getRequest(url)
  }

  getSubTask(sub_task_id: number) {
    const url = `/raven-api/v1/data-preparation/get_subtasks/${sub_task_id}`;
    return this.getRequest(url)
  }

  getSubTaskResults(sub_task_id: number) {
    const url = `/raven-api/v1/data-preparation/get_subtask_results/${sub_task_id}`;
    return this.getRequest(url)
  }

  getVariablesByDataframe(dataframe_id: number) {
    const url = `/raven-api/v1/data-preparation/get_variables_dataframe/${dataframe_id}`;
    return this.getRequest(url)
  }
  /** // TODO this function will be replaced by getSummaryStatistics
   * Function to get summary statistics for data preparation by cohort
   * @param data list of cohorts
   * @returns the summary statistics by cohort
   */
  getSummaryStatisticsCohort(data: string[]) {
    const url = './assets/jsons/summary_statistics_cohort.json';
    this.getRequest(url).subscribe((data) => {
      this.data_preparation_cohort.next(data);
    });
  }

  /** New function to get summary statistics for data preparation
   * Function to get summary statistics
   * @param taskId id of the data preparation task
   * @returns the summary statistics by cohort and center
   */
  getSummaryStatistics(taskId: number) {
    const url = './assets/jsons/summary_statistics.json';
    this.getRequest(url).subscribe((data) => {
      this.data_summary_statistics.next(data);
    });
  }

  // HTTP requests

  /**
   * Function to make a get request
   * @param URL url to make a get request
   * @returns 
   */
  getRequest(URL: any) {
    return this.httpClient.get<any>(URL)
  }
  /**
   * Function to make a post request
   * @param URL url to make a post request
   * @param data data to send in the post request
   * @returns
    */
  postRequest(URL: any, data?: any) {
    if (data) return this.httpClient.post<any>(URL, data)
    return this.httpClient.post<any>(URL, {})
  }
  /**
   * Function to make a put request
   * @param URL url to make a put request
   * @param data 
   * @returns 
   */
  patchRequest(URL: any, data?: any) {
    if (data) return this.httpClient.patch<any>(URL, data)
    return this.httpClient.patch<any>(URL, {})
  }
  /**
   * Function to make a delete request
   * @param URL url to make a delete request
   * @returns 
   */
  deleteRequest(URL: any) {
    return this.httpClient.delete<any>(URL)
  }


  //TODO TO REMOVE, only for testing

  /**
  * Function to get coEs granted for a workspace from the permit
  * @param workspace_id the workspace id
  * @returns the coEs granted
  */
  getCoEsGranted(workspace_id: number) {
    const url = `/raven-api/v1/permits/workspace/${workspace_id}`;
    return this.getRequest(url)
  }

  getVariables(): Observable<any[]> {
    const data = [
      { value: "AGE", label: "Age", type: "numeric" },
      { value: "TUMOR_SIZE", label: "Tumor Size", type: "numeric" },
      { value: "LOCAL_RECURRENCE", label: "Local Recurrence", type: "categorical" },
      { value: "MULTIFOCALITY", label: "Multifocality", type: "categorical" },
      { value: "STATUS", label: "Status", type: "categorical" },
      { value: "PRE_OPERATIVE_RADIO", label: "Pre Operative Radio", type: "categorical" },
      { value: "HISTOLOGY", label: "Histology", type: "categorical" },
      { value: "POST_OPERATIVE_RADIO", label: "Post Operative Radio", type: "categorical" },
      { value: "PRE_OPERATIVE_CHEMO", label: "Pre Operative Chemo", type: "categorical" },
      { value: "POST_OPERATIVE_CHEMO", label: "Post Operative Chemo", type: "categorical" },
      { value: "COMPLETENESS_OF_RESECTION", label: "Completeness Of Resection", type: "categorical" },
      { value: "DISTANT_METASTASIS", label: "Distant Metastasis", type: "categorical" },
      { value: "FNCLCC_GRADE", label: "Fnclcc Grade", type: "categorical" },
      { value: "TUMOR_RUPTURE", label: "Tumor Rupture", type: "categorical" },
      { value: "SEX", label: "Sex", type: "categorical" }
    ];

    return of(data); // simula una API
  }

  createCrosstabRequest(data: any) {
    console.log("createCrosstabRequest ", data);

    const url = `/raven-api/v1/data-preparation/create_crosstab`;
    return this.postRequest(url, data)
  }


  createT_tableRequest(data: any) {
    console.log("createT_tableRequest ", data);

    const url = `/raven-api/v1/data-preparation/create_t_test`;
    return this.postRequest(url, data)
  }

  createTable1Request(data: any) {
    console.log("createTTable1Request ", data);

    const url = `/raven-api/v1/data-preparation/create_table_1`;
    return this.postRequest(url, data)
  }

  createBasicArithmeticRequest(data: any) {
    console.log("createBasicArithmeticRequest ", data);

    const url = `/raven-api/v1/data-preparation/create_basic_arithmetic`;
    return this.postRequest(url, data)
  }

  
  getAlgorithmsList(data: any) {
    console.log("getAlgorithmsList ", data);

    const url = `/raven-api/v1/algorithms/by_cohorts_list`;
    return this.postRequest(url, data)
  }

  updateAlgorithmsStatus(data: any) {
    console.log("updateAlgorithmsStatus ", data);

    const url = `/raven-api/v1/algorithms/update_algorithm`;
    return this.patchRequest(url, data)
  }

  existsSummaryByCohort(data: any) {
     console.log("existsSummaryByCohort ", data);

    const url = `/raven-api/v1/algorithms/is_summary`;
    return this.postRequest(url, data)
  }
}