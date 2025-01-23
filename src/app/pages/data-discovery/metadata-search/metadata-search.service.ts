import { Injectable } from "@angular/core";
import { forkJoin, Subject } from "rxjs";
import { HttpClient} from "@angular/common/http";
// import { environment } from "src/environments/environment";

@Injectable({
  providedIn: 'root'
})
export class MetadataSearchService {

    // Metadata variables information observables
  variablesMetadata = new Subject<any>();
  variablesMetadata$ = this.variablesMetadata.asObservable();
  
  constructor(private httpClient: HttpClient) {}

    /**
     * Function to get the metadata variables of a cancer type
     * @returns 
     */
    //TODO: Change the URL to the correct one and add filter
  getVariablesMetadata() {
    // const url = `${environment.apiBaseUrl}/variables?...`;
    const url = './assets/jsons/metadata.json';
    this.getRequest(url).subscribe((data) => {
        this.variablesMetadata.next(data);
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
}