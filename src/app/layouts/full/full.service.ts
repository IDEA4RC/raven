import { Injectable } from "@angular/core";
import { forkJoin, Subject } from "rxjs";
import { HttpClient} from "@angular/common/http";
// import { environment } from "src/environments/environment";

@Injectable({
  providedIn: 'root'
})
export class FullService {

  // Workspaces observables
  workspace = new Subject<any>();
  workspace$ = this.workspace.asObservable();

  constructor(private httpClient: HttpClient) {}

  //TODO
  /**
   * Function to get the number of patients of each cancer type
   * @param workspaceId ID of the workspace to fetch
   * @returns
   */
  getWorkspace(workspaceId: string) {
    const url = './assets/jsons/workspace.json';
    this.getRequest(url).subscribe((data) => {
        this.workspace.next(data[0]);
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