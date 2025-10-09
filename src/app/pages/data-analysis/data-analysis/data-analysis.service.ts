import { Injectable } from "@angular/core";
import { forkJoin, Subject } from "rxjs";
import { HttpClient} from "@angular/common/http";

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

  constructor(private httpClient: HttpClient) {}

  /**
   * Function to get analysis of a workspace
   * @returns the list of analysis
   */
  getAnalysis() {
    // const url = '/raven-api/v1/analysis/';
    const url = './assets/jsons/analysis.json';
    this.getRequest(url).subscribe((data) => {
        this.analysis.next(data);
    });
  }
  /** //TODO
   * Method to create an analysis
   * @param data the data of the analysis to create
   * @returns 
   */
  createAnalysis(data:any) {
    // const url = `${environment.base_url}${environment.raven_url}/analysis/`;
    const url = '/raven-api/v1/analysis/';
    return this.postRequest(url, data);
  }

  /** //TODO
   * Method to delete an analysis
   * @param analysis_id the id of the analysis to delete
   * @returns 
   */
  deleteAnalysis(analysis_id:any) {
    // const url = `${environment.base_url}${environment.raven_url}/analysis/${analysis_id}/`;
    const url = `/raven-api/v1/analysis/${analysis_id}/`;
    return this.deleteRequest(url);
  }


  /**
   * Function to get cohorts of a workspace
   * @returns the list of cohorts
   */
  getCohorts() {
    // const url = '/raven-api/v1/cohort/';
    const url = './assets/jsons/cohort.json';
    this.getRequest(url).subscribe((data) => {
        this.cohort.next(data);
    });
  }






  // HTTP requests

  /**
   * Function to make a get request
   * @param URL url to make a get request
   * @returns 
   */
  getRequest(URL:any){
    return this.httpClient.get<any>(URL)
  }
  /**
   * Function to make a post request
   * @param URL url to make a post request
   * @param data data to send in the post request
   * @returns
    */
  postRequest(URL:any,data?:any){
    if(data) return this.httpClient.post<any>(URL,data)
    return this.httpClient.post<any>(URL,{})  
  }
  /**
   * Function to make a put request
   * @param URL url to make a put request
   * @param data 
   * @returns 
   */
  patchRequest(URL:any,data?:any){
    if(data) return this.httpClient.patch<any>(URL,data)
    return this.httpClient.patch<any>(URL,{})  
  }
  /**
   * Function to make a delete request
   * @param URL url to make a delete request
   * @returns 
   */
  deleteRequest(URL:any){
    return this.httpClient.delete<any>(URL)
  }

  
}