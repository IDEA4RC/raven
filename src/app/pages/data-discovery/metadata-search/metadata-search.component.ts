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
  readonly thirdCtrll = new FormControl('', Validators.required);

  cancerTypeFormGroup = this._formBuilder.group({
    firstCtrl: this.firstCtrl,
  });
  variablesFormGroup = this._formBuilder.group({
    // secondCtrl: this.secondCtrl,
  });
  availabilityFormGroup = this._formBuilder.group({
    thirdCtrll: this.thirdCtrll,
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

  jsonData: any;
  centers: any[] = [];
  variables: any[] = [];
  displayedColumns: string[] = ['variable']; // Start with 'variable' column

  availableData: any[] = [];
    

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

    // Availability per center
    this.jsonData = {
      centers: [
        { id: 'int', name: 'INT', years: '2014-2020' },
        { id: 'iss', name: 'ISS-FJD', years: '2012-2021' },
        { id: 'aphp', name: 'APHP', years: '2016-2022' },
        { id: 'vgr', name: 'VGR', years: '2015-2020' },
        { id: 'msci', name: 'MSCI', years: '2018-' }
      ],
      variables: [
        { name: 'Sex', availability: { int: '✔️', iss: '✔️', aphp: '✔️', vgr: '✔️', msci: '✔️' } },
        { name: 'Birth Year', availability: { int: '✔️', iss: '✔️', aphp: '✔️', vgr: '✔️', msci: '✔️' } },
        { name: 'Histology group', availability: { int: '✔️', iss: '❌', aphp: '⬤', vgr: '⬤', msci: '✔️' } },
        { name: 'Topography', availability: { int: '✔️', iss: '✔️', aphp: '⬤', vgr: '⬤', msci: '✔️' } },
        { name: 'Loco-regional stage', availability: { int: '❌', iss: '✔️', aphp: '✔️', vgr: '✔️', msci: '✔️' } },
        { name: 'Treatment response', availability: { int: '✔️', iss: '✔️', aphp: '❌', vgr: '❌', msci: '✔️' } }
      ]
    };

    this.centers = this.jsonData.centers;
    this.variables = this.jsonData.variables;
    // Generate displayed columns dynamically
    this.displayedColumns = ['variable', ...this.centers.map(c => c.id)];

  }

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
  this.availableData = this.selectionService.getDataSelected();
 }
}




