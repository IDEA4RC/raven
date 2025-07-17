import { Injectable } from "@angular/core";
import { forkJoin, Subject } from "rxjs";
import { HttpClient} from "@angular/common/http";
// import { environment } from "src/environments/environment";

@Injectable({
  providedIn: 'root'
})
export class WorkspaceService {

  // Workspaces observables
  workspace = new Subject<any>();
  workspace$ = this.workspace.asObservable();

  individualWorkspace = new Subject<any>();
  individualWorkspace$ = this.individualWorkspace.asObservable();

  workspaceHistory = new Subject<any>();
  workspaceHistory$ = this.workspaceHistory.asObservable();
    

  
  constructor(private httpClient: HttpClient) {}

  /**
   * Function to get the number of patients of each cancer type
   * @returns the list of workspaces
   */
  getWorkspace() {
    const url = '/raven-api/v1/workspaces/';
    this.getRequest(url).subscribe((data) => {
        this.workspace.next(data);
    });
  }

  /**
   * Function to get the workspace by id
   * @param id id of the workspace
   * @returns the workspace with the given id
   */
  getWorkspaceById(id: number) {
    const url = `/raven-api/v1/workspaces/${id}`;
    this.getRequest(url).subscribe((data) => {      
        this.individualWorkspace.next(data);
    });
  }

  /**
   * Function to get the workspace history by workspace id
   * @param workspace_id id of the workspace
   * @returns the workspace history of the given workspace id
   */
  getWorkspaceHistory(workspace_id: number) {
    const url = `/raven-api/v1/workspace-history/${workspace_id}`;
    this.getRequest(url).subscribe((data) => {
        this.workspaceHistory.next(data);
    });
  }

  /**
   * Function to save the workspace in the database
   * @param data data of the workspace to save
   * @returns the if of the workspace removed
   */
  deleteWorkspace(id: number) {
    const url = `/raven-api/v1/workspaces/${id}`;
    return this.httpClient.delete<any>(url);
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