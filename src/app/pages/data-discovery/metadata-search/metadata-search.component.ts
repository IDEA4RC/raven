import {AfterViewInit, ChangeDetectorRef, Component, ElementRef, OnInit, QueryList, ViewChild, ViewChildren, inject} from '@angular/core';
import {FormBuilder, Validators, FormControl, FormsModule, ReactiveFormsModule} from '@angular/forms';
import { Observable } from 'rxjs';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from "@angular/material/paginator";
import { MatSort } from '@angular/material/sort';
import { BreakpointObserver } from '@angular/cdk/layout';
import { MetadataSearchService } from './metadata-search.service';
import { MetadataVariables } from './metadata.model';
import {MatTableModule} from '@angular/material/table';
import { SelectionModel } from '@angular/cdk/collections';
import { SelectionService } from './selection.service';

@Component({
  selector: 'app-metadata-search',
  templateUrl: './metadata-search.component.html',
  styleUrl: './metadata-search.component.scss'
})
// implements OnInit
export class MetadataSearchComponent implements OnInit {


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

  // Tables Paginator, Sort and Filter
  @ViewChild("filter", { static: true }) filter: ElementRef;

  
  public dataSourceAll = new MatTableDataSource<MetadataVariables>();
  // Cancer type selected
  cancerType: string = "";

  entities: any[] = []
  filteredDataByCancerType: any = []
  dataFiltered: any = []
  filteredDataSources: { [key: string]: MatTableDataSource<any> } = {};
  selection = new SelectionModel<any>(true, []);

  filterSearcher:any = "";

  constructor(
    public metadataService: MetadataSearchService,
    public selectionService: SelectionService,
    private cdr: ChangeDetectorRef
  ) {}
  ngOnInit(): void {

    // Get observables variables
    this.observable_metadata_variables$ = this.metadataService.variablesMetadata;

    // Subscribe to the observables
    this.observable_metadata_variables$.subscribe((data) => {

      // Filter data by the cancer type selected on the first form group (Cancer Type)
      this.filteredDataByCancerType = data.filter((item: any) => item.dataset.includes(this.cancerType));
      this.dataFiltered = this.filteredDataByCancerType;
      
      // Get unique entities
      this.entities = [...new Set(this.filteredDataByCancerType.filter((variable: any) => variable.entity != null).map((item: any) => item.entity))];
      this.entities.unshift("All");
    })

    

  }
 
  // applyFilterAll(event: Event) {
    
  //   const filterValue = (event.target as HTMLInputElement).value;
  //   this.filterSearcher = filterValue.trim().toLowerCase()
    
  //   // this.filteredDataByCancerType = filterValue.trim().toLowerCase();
  // }
  // applyFilterAll(event: Event) {
  //   const filterValue = (event.target as HTMLInputElement).value.trim().toLowerCase();
    
  //   this.dataFiltered = this.filteredDataByCancerType.filter((item: { variable_name: string; }) =>
  //     item.variable_name.toLowerCase().includes(filterValue) // Adjust according to your data structure
  //   );
  // }
  applyFilterAll(filterValue: string) {
    this.dataFiltered = this.filteredDataByCancerType.filter((item: { variable_name: string; }) =>
      item.variable_name.toLowerCase().includes(filterValue.toLowerCase()) // Adjust based on your data structure
    );    
    this.cdr.detectChanges(); // Force change detection

  }
  
  
  // Submit function for cancer type selection (HNC or Sarcoma)
  selectedCancerType(value: any) {
    this.cancerType = value.firstCtrl;

    // Get metadata variables
    this.metadataService.getVariablesMetadata()
    
    console.log(this.cancerType);
 }

 onTabChange(event: any) {
  console.log(event);
  }


 continue() {
  console.log("continue",this.selectionService.getDataSelected());
 }
}




