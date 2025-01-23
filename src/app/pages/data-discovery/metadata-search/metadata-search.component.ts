import {Component, ElementRef, OnInit, ViewChild, inject} from '@angular/core';
import {FormBuilder, Validators, FormControl, FormsModule, ReactiveFormsModule} from '@angular/forms';
import { Observable } from 'rxjs';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from "@angular/material/paginator";
import { MatSort } from '@angular/material/sort';
import { BreakpointObserver } from '@angular/cdk/layout';
import { MetadataSearchService } from './metadata-search.service';
import { MetadataVariables } from './metadata.model';
import {MatTableModule} from '@angular/material/table';

export interface PeriodicElement {
  name: string;
  position: number;
  weight: number;
  symbol: string;
}

const ELEMENT_DATA: PeriodicElement[] = [
  {position: 1, name: 'Hydrogen', weight: 1.0079, symbol: 'H'},
  {position: 2, name: 'Helium', weight: 4.0026, symbol: 'He'},
  {position: 3, name: 'Lithium', weight: 6.941, symbol: 'Li'},
  {position: 4, name: 'Beryllium', weight: 9.0122, symbol: 'Be'},
  {position: 5, name: 'Boron', weight: 10.811, symbol: 'B'},
  {position: 6, name: 'Carbon', weight: 12.0107, symbol: 'C'},
  {position: 7, name: 'Nitrogen', weight: 14.0067, symbol: 'N'},
  {position: 8, name: 'Oxygen', weight: 15.9994, symbol: 'O'},
  {position: 9, name: 'Fluorine', weight: 18.9984, symbol: 'F'},
  {position: 10, name: 'Neon', weight: 20.1797, symbol: 'Ne'},
];

@Component({
  selector: 'app-metadata-search',
  templateUrl: './metadata-search.component.html',
  styleUrl: './metadata-search.component.scss'
})
// implements OnInit
export class MetadataSearchComponent {

  displayedColumns: string[] = ['position', 'name', 'weight', 'symbol'];
  dataSource = ELEMENT_DATA;

  

  // Form groups
  private _formBuilder = inject(FormBuilder);
  readonly firstCtrl = new FormControl('', Validators.required);
  readonly secondCtrl = new FormControl('', Validators.required);

  cancerTypeFormGroup = this._formBuilder.group({
    firstCtrl: this.firstCtrl,
  });
  variablesFormGroup = this._formBuilder.group({
    secondCtrl: this.secondCtrl,
  });
  // secondFormGroup = this._formBuilder.group({
  //   secondCtrl: ['', Validators.required],
  // });
  
  thirdFormGroup = this._formBuilder.group({
    thirdCtrl: ['', Validators.required],
  });
  fourthFormGroup = this._formBuilder.group({
    fourthCtrl: ['', Validators.required],
  });

  isLinear = false;

  // Observables
  observable_metadata_variables$ : Observable<any> | undefined;

  // Tables columns
  // displayedColumns = [
  //   "variable_name",
  //   "variable_description",
  //   "datatype",
  //   "values"
  // ];

  // Cancer type selected
  cancerType: string = "";



  // constructor(
  //   public metadataService: MetadataSearchService,
  // ) {}
  // ngOnInit(): void {

  //   // Get observables variables
  //   this.observable_metadata_variables$ = this.metadataService.variablesMetadata;

  //   // Subscribe to the observables
  //   this.observable_metadata_variables$.subscribe((data) => {
      
  //     this.dataSource.data = data as any[];
  //     this.ngAfterViewInit()
  //   })


  //   // Get metadata variables
  //   this.metadataService.getVariablesMetadata()


  // }
  
  
  
  // Submit function for cancer type selection (HNC or Sarcoma)
  selectedCancerType(value: any) {
    this.cancerType = value.firstCtrl;
    
    console.log(this.cancerType);
 }
}




