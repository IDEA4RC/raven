import { Injectable } from "@angular/core";
import { forkJoin, Subject } from "rxjs";
import { HttpClient} from "@angular/common/http";
import { environment } from "src/environments/environment";
import { da } from "date-fns/locale";
// import { environment } from "src/environments/environment";

@Injectable({
  providedIn: 'root'
})
export class MetadataSearchService {

  // Cancer patients information observables
  patients = new Subject<any>();
  patients$ = this.patients.asObservable();
    
  // Metadata variables information observables
  variablesMetadata = new Subject<any>();
  variablesMetadata$ = this.variablesMetadata.asObservable();
  
  constructor(private httpClient: HttpClient) {}

  /**
   * Function to get the number of patients of each cancer type
   * @returns
   */
  getCancerPatients() {
    const url = './assets/jsons/patients.json';
    this.getRequest(url).subscribe((data) => {
        this.patients.next(data);
    });
  }

    /**
     * Function to get the metadata variables of a cancer type
     * @returns 
     */
    //TODO: Change the URL to the correct one and add filter
  getVariablesMetadata() {
    // const url = `${environment.apiBaseUrl}/variables?...`;
    const url = './assets/jsons/metadata_v0.3.json';
    return this.getRequest(url).subscribe((data) => {
        this.variablesMetadata.next(data);
    });
  }

   /**
     * Function to get the metadata variables of a cancer type
     * @returns 
     */
    //TODO: Change the URL to the correct one and add filter
    getVariablesMetadataAvailability() {
      // const url = `${environment.apiBaseUrl}/variables?...`;
      const url = './assets/jsons/metadata_v0.2.json';
      this.getRequest(url).subscribe((data) => {
          this.variablesMetadata.next(data);
      });
    }

    /**
     * Method to create a workspace
     * @param data the data of the workspace to create
     * @returns 
     */
    createWorkspace(data:any) {
      
      // const url = `${environment.base_url}${environment.raven_url}/workspaces/`;    
      const url = '/raven-api/v1/workspaces/create_workspace';
      return this.postRequest(url, data);
    }

    /**
     * Method to create a data application (send data to the data permit platform)
     * @param data the data of the data application to create
     *  */
    createDataApplication(data:any) {
      console.log("AAAAAAAAAAAAAAAAAAAd",data);
      
      const url = '/api/workspace-application/init';
      return this.postRequest(url, data);
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
}