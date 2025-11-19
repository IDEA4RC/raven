import { Injectable } from "@angular/core";
import { BehaviorSubject, forkJoin, Observable, Subject } from "rxjs";
import { HttpClient} from "@angular/common/http";
// import { environment } from "src/environments/environment";

@Injectable({
  providedIn: 'root'
})
export class FullService {

  // Workspaces observables
  private workspaceSubject = new BehaviorSubject<any>(null);
  public workspace$: Observable<any> = this.workspaceSubject.asObservable();
  public currentWorkspace: any = null;

  constructor(private httpClient: HttpClient) {}

  //TODO: Cambiar any por el tipo Workspace
  

  /**
   * Obtiene un workspace por ID
   * @param workspaceId ID del workspace
   */
  getWorkspace(workspaceId: string) {
    const url = `/raven-api/v1/workspaces/${workspaceId}`;
    this.getRequest(url).subscribe((data) => {
      this.currentWorkspace = data;
      this.workspaceSubject.next(data);
    });
  }




  // HTTP requests helper
  getRequest(URL: string) {
    return this.httpClient.get<any>(URL);
  }

  postRequest(URL: string, data?: any) {
    return this.httpClient.post<any>(URL, data || {});
  }

  patchRequest(URL: string, data?: any) {
    return this.httpClient.patch<any>(URL, data || {});
  }

}