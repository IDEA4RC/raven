import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { MetadataVariables } from './metadata.model';

@Injectable({
  providedIn: 'root',
})
export class TableDataService {
  private dataSubject = new BehaviorSubject<MetadataVariables[]>([]);
  data$ = this.dataSubject.asObservable();

  /** Set table data so all tables share the same reference */
  setData(data: MetadataVariables[]): void {
    this.dataSubject.next(data);
  }

  /** Get the latest table data */
  getData(): MetadataVariables[] {
    return this.dataSubject.getValue();
  }
}