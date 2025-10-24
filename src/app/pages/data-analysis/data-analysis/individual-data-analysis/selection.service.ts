import { Injectable } from '@angular/core';
import { SelectionModel } from '@angular/cdk/collections';
import { Cohort } from './cohort-selection/cohort.model';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class SelectionService {

  
  private selectedItemsSubject = new BehaviorSubject<any[]>([]);
  // Observable to expose the selected items
  selectedItems$: Observable<any[]> = this.selectedItemsSubject.asObservable();

  

  data: any[] = [];
  dataSelected: any[] = [];

  constructor() {}


  // Update selection
  setSelected(items: any[]) {
    this.selectedItemsSubject.next(items);
  }

  // Get current selection
  getSelected(): any[] {
    return this.selectedItemsSubject.getValue();
  }

  

}