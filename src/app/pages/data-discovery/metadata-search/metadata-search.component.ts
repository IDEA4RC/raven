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
import { MatSnackBar } from '@angular/material/snack-bar';
import { ngxCsv } from 'ngx-csv/ngx-csv';
import { trigger, state, style, animate, transition } from '@angular/animations';
import { MatDialog } from '@angular/material/dialog';
import { DialogformLoginComponent } from './dialogform-login/dialogform-login.component';

@Component({
  selector: 'app-metadata-search',
  templateUrl: './metadata-search.component.html',
  styleUrl: './metadata-search.component.scss',
  animations: [
    trigger('stepTransition', [
      state('stepper', style({
        transform: 'translateX(0)',
        opacity: 1
      })),
      state('completed', style({
        transform: 'translateX(-100%)',
        opacity: 0,
        display: 'none'
      })),
      state('newContent', style({
        transform: 'translateX(0)',
        opacity: 1
      })),
      transition('stepper => completed', [
        animate('400ms ease-out')
      ]),
      transition('completed => newContent', [
        style({ transform: 'translateX(100%)', opacity: 0 }),
        animate('400ms ease-out')
      ])
    ])
  ]
})

// implements OnInit
export class MetadataSearchComponent implements OnInit {


  // Form groups
  private _formBuilder = inject(FormBuilder);
  readonly firstCtrl = new FormControl('', Validators.required);
  readonly secondCtrl = new FormControl('', Validators.required);
  readonly thirdCtrll = new FormControl('', Validators.required);
  readonly fourthCtrll = new FormControl('', Validators.required);
  readonly workspaceNameCtrl = new FormControl('', Validators.required);
  readonly workspaceDescriptionCtrl = new FormControl('', Validators.required);

  
  cancerTypeFormGroup = this._formBuilder.group({
    firstCtrl: this.firstCtrl,
  });
  variablesFormGroup = this._formBuilder.group({
    // secondCtrl: this.secondCtrl,
  });
  availabilityFormGroup = this._formBuilder.group({
    // thirdCtrll: this.thirdCtrll,
  });
  detailAnalysisFormGroup = this._formBuilder.group({
    // fourthCtrl: this.fourthCtrll,
  });

  workspaceFormGroup = this._formBuilder.group({
    workspaceNameCtrl: this.workspaceNameCtrl,
    workspaceDescriptionCtrl: this.workspaceDescriptionCtrl

  });

  


  isLinear = false;

  // Observables
  observable_patients$ : Observable<any> | undefined;
  observable_metadata_variables$ : Observable<any> | undefined;

  // Tables Paginator, Sort and Filter
  @ViewChild("filter", { static: true }) filter: ElementRef;

  
  public dataSourceAll = new MatTableDataSource<MetadataVariables>();
  // Cancer type selected
  cancerType: string = "";
  numberOfPatientsHNC: number = 0;
  numberOfPatientsSarcoma: number = 0;

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

  // Data selected on the variables pre-selection
  availableData: any[] = [];
  availaveDataBlock: any[] = [];

  // Data selected on the availability pre-selection
  selectedVariables: any[] = [];
  selectedVariablesByCenter: any[] = [];
  selectedVariablesBlock: any[] = [];
  selectedCenters: any[] = [];
  selectionCenters = new SelectionModel<any>(true, []);

  // Detailed data of each center in each variables
  detailedDataMapped: any[] = [];
    
  // Variable to check if the metadata has been completed in order to create the workspace
  metadataSearchFinished:boolean = false;

  // Add animation state property
  animationState = 'stepper';

  // Disease phase filter (Detailed analysis screen)
  diagnosisChecked = false;
  progressionChecked = false;
  recurrenceChecked = false;

  phaseFilterForm = this._formBuilder.group({
    diagnosis: [false],
    progression: [false],
    recurrence: [false]
  });
  

  constructor(
    public metadataSearchService: MetadataSearchService,
    public selectionService: SelectionService,
    private cdrVariables: ChangeDetectorRef,
    private cdrAvailability: ChangeDetectorRef,
    private cdrDetailAnalysis: ChangeDetectorRef,
    private snackBar: MatSnackBar,
    private dialogModel: MatDialog,


  ) {}
  ngOnInit(): void {

    // Get observables variables
    this.observable_patients$ = this.metadataSearchService.patients;
    this.observable_metadata_variables$ = this.metadataSearchService.variablesMetadata;

    // Subscribe to the observable patients
    this.observable_patients$.subscribe((data) => {
      this.numberOfPatientsHNC = data.HNC
      this.numberOfPatientsSarcoma = data.Sarcoma
      
    });

    // Subscribe to the observable of metadata variables
    this.observable_metadata_variables$.subscribe((data) => {

      // Filter data by the cancer type selected on the first form group (Cancer Type)
      this.filteredDataByCancerType = data.filter((item: any) => item.dataset.includes(this.cancerType));
      this.dataFiltered = this.filteredDataByCancerType;
      
      // Get unique entities
      this.entities = [...new Set(this.filteredDataByCancerType.filter((variable: any) => variable.entity != null).map((item: any) => item.entity))];
      this.entities.unshift("All");
    })


    this.metadataSearchService.getCancerPatients();

  }

  /**
   * Filter function for the variables pre-selection table
   * @param filterValue text to filter from the search engine
   */
  applyFilterVariables(filterValue: string) {
    this.dataFiltered = this.filteredDataByCancerType.filter((item: { variable_name: string; }) =>
      item.variable_name.toLowerCase().includes(filterValue.toLowerCase()) // Adjust based on your data structure
    );    
    this.cdrVariables.detectChanges(); // Force change detection

  }

  /**
   * Filter function for the availability per center table
   * @param filterValue text to filter from the search engine
   */
  applyFilterAvailability(filterValue: string) {    
    this.availableData = this.availaveDataBlock.filter((item: { variable_name: string; }) =>
      item.variable_name.toLowerCase().includes(filterValue.toLowerCase()) // Adjust based on your data structure
    );
    this.cdrAvailability.detectChanges(); // Force change detection
  }

  /**
   * Filter function for the detail analysis table
   * @param filterValue text to filter from the search engine
   */
  applyFilterDetailAnalysis(filterValue: string) {
    this.selectedVariables = this.selectedVariablesBlock.filter((item: { variable_name: string; }) =>
      item.variable_name.toLowerCase().includes(filterValue.toLowerCase()) // Adjust based on your data structure
    );
    this.cdrDetailAnalysis.detectChanges(); // Force change detection
  }
  
  // Method to get the selected phases from the checkboxes
  getSelectedPhases() {
    const formValues = this.phaseFilterForm.value;
    const selectedPhases: string[] = [];
    
    if (formValues.diagnosis) selectedPhases.push('diagnosis');
    if (formValues.progression) selectedPhases.push('progression');
    if (formValues.recurrence) selectedPhases.push('recurrence');
    
    return selectedPhases;
    
  }
  // Filter function of the disease checkbox (diagnosis, progression and recurrence)
  onPhaseFilterChange() {
    const selectedPhases = this.getSelectedPhases();
    console.log('Selected phases:', selectedPhases);

    let filteredData = this.selectedVariablesBlock.filter(item => item.variable_name === "Sex");
    console.log('Filtered data:', filteredData);
    
    if (selectedPhases.length > 0) {
      if (selectedPhases.includes('diagnosis')) {
        console.log('Filtering by diagnosis');
        
        filteredData = filteredData
        .map((item: any) => {
          // Filter the centers based on availability_d
          const filteredCenters = item.centers.filter((centerObj: any) => {
            const centerName = Object.keys(centerObj)[0];
            const center = centerObj[centerName];
            return center.availability_d === 'True';
          });
      
          // Only include the item if it has at least one matching center
          if (filteredCenters.length > 0) {
            return {
              ...item,
              centers: filteredCenters,
            };
          }
          return null;
        })
        .filter((item: null) => item !== null);
      
      console.log(filteredData);
  // .filter((item) => item !== null);
  // .filter((item: null) => item !== null);
        
  //       filteredData = filteredData.filter((item: any) => 
  //         item.centers.forEach((centerObj: any) => {
  //           const centerName = Object.keys(centerObj);
  //           const center = centerObj[centerName];
  //           return center.availability_d === "True";
  //         })
        // some((centerObj: any) => {
        //     const centerName = Object.keys(centerObj)[0];
        //     const center = centerObj[centerName];
        //     return center.availability_d === "True";
        //   })

        // );
      }
      
  //     // if (selectedPhases.includes('progression')) {
  //     //   filteredData = filteredData.filter((item: any) => 
  //     //     item.centers.some((centerObj: any) => {
  //     //       const centerName = Object.keys(centerObj)[0];
  //     //       const center = centerObj[centerName];
  //     //       return center.availability_p === "True";
  //     //     })
  //     //   );
  //     // }
      
  //     // if (selectedPhases.includes('recurrence')) {
  //     //   filteredData = filteredData.filter((item: any) => 
  //     //     item.centers.some((centerObj: any) => {
  //     //       const centerName = Object.keys(centerObj)[0];
  //     //       const center = centerObj[centerName];
  //     //       return center.availability_r === "True";
  //     //     })
  //     //   );
  //     // }
  //     console.log('Filtered data after applying phase filter:', filteredData);
      
  //     // this.selectedVariables = filteredData;
  //     this.cdrDetailAnalysis.detectChanges(); // Force change detection
    }
  }

  // Submit function for cancer type selection (HNC or Sarcoma)
  selectedCancerType(value: any) {
    this.cancerType = value.firstCtrl;

    // Get metadata variables
    this.metadataSearchService.getVariablesMetadata()
    
    console.log(this.cancerType);
 }

 onTabChange(event: any) {
  console.log(event);
  }

// Functions to select the centers

 /** Whether the number of selected elements matches the total number of rows. */
 isAllSelectedCenters(): any {
  const numSelected = this.selectionCenters.selected.length;
  const numRows = this.centers.length;
  return numSelected === numRows;
}

/** Selects all rows if they are not all selected; otherwise clear selection. */
masterToggleCenters(): void { 
  
  // Check if all centers are selected
  if(this.isAllSelectedCenters()) {
    // If all are selected, clear the selection
    this.selectionCenters.clear();
    this.selectionService.clearSelectionCenters();
  } else {
    // If not all are selected, select all
    this.centers.forEach((center) => 
      this.selectionCenters.select(center.center),
    );
    this.selectionService.selectAllCenters(this.centers);

  }
    
}

/** The label for the checkbox on the passed row */
checkboxLabelCenters(row?: MetadataVariables): string {

  if (!row) {
    return `${this.isAllSelectedCenters() ? 'select' : 'deselect'} all`;
  } 
  return `${this.selectionCenters.isSelected(row) ? 'deselect' : 'select'} row ${
    // row.variable_name + 1
    row
  }`;
}

  /** Toggle selection center and update the service */
  actionCenter(row: any) {
    this.selectionService.toggleSelectionCenters(row);
  }




  // Submit function for variables selection
 continueVariables() {
  // Get the selected variables data from the selection service
  this.availaveDataBlock = this.selectionService.getDataSelected(); // This variable is going to be used for the searcher, to get the variables selected
  this.availableData = this.selectionService.getDataSelected();
  this.detailedDataMapped = this.mapDetailedInformation(this.availableData);
 }
 // Submit function for availability selection
 continueAvailability() {
  this.selectedVariablesBlock = this.selectionService.getDataSelected();
  this.selectedVariables = this.selectionService.getDataSelected();
  this.selectedCenters = this.selectionService.getSelectedCenters();


  
  this.selectedVariablesByCenter = this.selectedCenters.map(center => {
    return {
      center: center,
      variables: this.selectedVariables.filter(variable => 
        variable.centers.some((c: any) => c.hasOwnProperty(center))
      )
    };
  });
  console.log("selectedVariablesByCenter", this.selectedVariablesByCenter);
  
  
  // Clear the selection and mark as selected the centers selected
  this.selectionCenters.clear();
  this.selectedCenters.forEach((center) => {
    this.selectionCenters.select(center.center);
  }
  );
 }

  // flattenVariables(data: any[]) {
  //   let result = [];

  //   for (let v of data) {
  //     for (let centerObj of v.centers) {
  //       const [centerCode, centerData] = Object.entries(centerObj)[0];
  //       result.push({
  //         ...v,
  //         center_code: centerCode,
  //         ...centerData
  //       });
  //     }
  //   }

  //   return result;
  // }

 /**
  * Function to download the pre-selected variables data as a CSV file (Step 2)
  */
 downloadPreSelection() {
  // Get the selected variables data from the selection service
  this.availableData = this.selectionService.getDataSelected();
  // Define CSV headers
  const headers = [
    'Variable Name',
    'Description',
    'Data Type',
    'Values',
  ];

  // Prepare data for CSV export
  const exportData = this.availableData.map(variable => {
    // Format values for better readability
    const values = Array.isArray(variable.values) ? variable.values.join('; ') : variable.values;
  
    
    // Return a flat object for each row
    return {
      'Variable Name': variable.variable_name,
      'Description': variable.variable_description || '',
      'Data Type': variable.datatype,
      'Values': values
    };
  });
  // Download the CSV file
  this.downloadCSV(exportData, headers, "pre-selected-variables");

 }
 /**
  * Function to download the availability of the selected variables per center as a CSV file (Step 3)
  */
 downloadAvailabilityPerCenter() {
  // Get the selected variables data from the selection service
  this.selectedVariables = this.selectionService.getDataSelected();
  this.selectedCenters = this.selectionService.getSelectedCenters();


  // Step 1: Build header columns
  const headerColumns = ['Variable'];
  this.selectedCenters.forEach(center => {
    headerColumns.push(`${center}_D`, `${center}_P`, `${center}_R`);
  });
  

  // Step 2: Construct flat row data
  const csvRows = this.selectedVariables.map(variable => {
    const row: any = {
      Variable: variable.variable_name
    };

    // Initialize all columns as empty or false
    this.selectedCenters.forEach(center => {
      row[`${center}_D`] = '';
      row[`${center}_P`] = '';
      row[`${center}_R`] = '';
    });

    // Fill in available values
    variable.centers.forEach((centerObj: any) => {
      const [centerName, centerInfo] = Object.entries(centerObj)[0] as [string, { 
        availability_d: any, 
        availability_p: any, 
        availability_r: any 
      }];
      row[`${centerName}_D`] = centerInfo.availability_d;
      row[`${centerName}_P`] = centerInfo.availability_p;
      row[`${centerName}_R`] = centerInfo.availability_r;
    });

    return row;
  });
  this.downloadCSV(csvRows, headerColumns, "availability-per-center");
 }
 /**
 * Downloads the selected variables data as a CSV file
 * @param filename Optional custom filename (defaults to 'selected-variables.csv')
 */
downloadCSV(data: any[], headers: string[], filename: string = 'selected-variables'): void {
  if (!data || data.length === 0) {
    this.showNotification(
      "black",
      "No variables selected to download",
      "bottom",
      "center"
    );
    return;
  }

  try {
    
    // CSV export options
    const options = { 
      fieldSeparator: ',',
      quoteStrings: '"',
      decimalseparator: '.',
      showLabels: true, 
      showTitle: false,
      title: 'Selected Variables',
      useBom: true,
      noDownload: false,
      headers: headers
    };
    
    // Generate and download CSV
    new ngxCsv(data, filename, options);
    
    console.log(`Downloaded ${this.availableData.length} selected variables as CSV`);
  } catch (error) {
    console.error('Error downloading variables as CSV:', error);
    this.showNotification(
      "black",
      "Error downloading variables",
      "bottom",
      "center"
    );
  }
}

/**
 * Function to show a notification in the frontend
 * @param colorName the color of the notification
 * @param text the text message
 * @param placementFrom the position from where the notification will appear
 * @param placementAlign the position where the notification will align
 */
showNotification(colorName: string, text: string, placementFrom: any, placementAlign: any) {
  this.snackBar.open(text, "", {
    duration: 2000,
    verticalPosition: placementFrom,
    horizontalPosition: placementAlign,
    panelClass: colorName
  });
}


 // Method to trigger the animation and transition
 continueDetailAnalysis() {
  // First change animation state to move stepper out
  this.animationState = 'completed';
  
  // After animation completes, show new content with animation
  setTimeout(() => {
    this.metadataSearchFinished = true;
    this.animationState = 'newContent';
  }, 400); // Match this with the animation duration
}


createWorkspace(): void {  

  // Check if user is logged in by verifying access_token in localStorage
  const accessToken = localStorage.getItem('access_token');
  if (!accessToken) {
    console.log('User not logged in. Opening login dialog.');
    
    const dialogRef = this.dialogModel.open(DialogformLoginComponent, {
    // width: "740px",
    disableClose: true,
    data: {
      workspaceName: this.workspaceFormGroup.value.workspaceNameCtrl,
      workspaceDescription: this.workspaceFormGroup.value.workspaceDescriptionCtrl,
      cancerType: this.cancerType,
      selectedVariables: this.selectedVariables,
      selectedCenters: this.selectedCenters
    }
  });
    
    
  } else {
    console.log('User is logged in. Proceeding to create workspace.');
    this.saveWorkspace();
  }
  
  
}
saveWorkspace() {

    // Get values from the form
    const workspaceName = this.workspaceNameCtrl.value;
    const workspaceDescription = this.workspaceDescriptionCtrl.value;
    

    let wokspaceData = 
      {
        "name": workspaceName,
        "description": workspaceDescription,
        "metadata_search": 2,
        "data_access": 1,
        "data_analysis": 0,
        "results_report": 0,
        "status": "Data Permit",
        "team_ids": []
      }
    //   {
    //     "name": "HNC analysis risk factors v4",
    //     "description": "This study focuses on identifying and analyzing risk factors associated with Head and Neck Cancer (HNC). By leveraging clinical, demographic, behavioral, and lifestyle data, the project aims to uncover patterns and variables that contribute to the development and progression of HNC. The goal is to support early detection strategies, improve patient stratification, and contribute to the development of personalized treatment and prevention approaches. Advanced statistical and machine learning methods are applied to evaluate the influence of multiple variables on cancer risk, with particular attention to modifiable factors.",
    //     "metadata_search": 2,
    //     "data_access": 1,
    //     "data_analysis": 0,
    //     "results_report": 0,
    //     "status": "Data Permit",
    //     "team_ids": []
    // }
    this.metadataSearchService.createWorkspace(wokspaceData).subscribe({
      next: (response: any) => {
        console.log('Workspace created successfully:', response);

        // Map selected variables to their IDs //TODO
        let variablesId = ["SOMETHING", "SOMETHING", "SOMETHING"]
        // this.data.selectedVariables.map((variable: any) => variable.id);
        // Create the data application object
        let dataApplication = {
          
            "user_id": "e140f671-2247-4c53-b7bf-6cefa6ac6d37",
            "workspace_id": response.id,
            "workspace_name": response.name,
            "metadata": {
                "type_cancer": this.cancerType,
                "variables_id": variablesId,
                "coes_id": this.selectedCenters
            
            }
        }
        //  "user_id": "e140f671-2247-4c53-b7bf-66d37",
        //   "workspace_id":12,
        //   "workspace_name": "Sarcoma Disease Trends",
        //   "metadata": {
        //       "type_cancer": "H&N",
        //       "variables_id": ["SOMETHING", "SOMETHING", "SOMETHING"],
        //       "coes_id": ["INT", "CLB"]
        //   }
        this.metadataSearchService.createDataApplication(dataApplication).subscribe({
          next: (response: any) => {
            console.log('Data application created successfully:', response);
            this.showNotification(
              "green",
              "Workspace created successfully",
              "bottom",
              "center"
            );
            // this.showWorkspaceForm = true;
          },
          error: (error: any) => {
            console.error('Error creating data application:', error);
            this.showNotification(
              "black",
              "Error creating Data Application",
              "bottom",
              "center"
            );
          }
        });
      },
      error: (error: any) => {
        console.error('Error creating workspace:', error);
        this.showNotification(
          "black",
          "Error creating workspace",
          "bottom",
          "center"
        );
      }
    })


  }
// MALOOOOOO Method to handle workspace creation from form data (by clicking continue button)
// saveWorkspace() {
//     // Get values from the form
//     const workspaceName = this.workspaceNameCtrl.value;
//     const workspaceDescription = this.workspaceDescriptionCtrl.value;
    
//     // Validate form data
//     if (!workspaceName || !workspaceDescription) {
//       this.showNotification(
//         "black",
//         "Please fill in all workspace fields",
//         "bottom",
//         "center"
//       );
//       return;
//     }
    
//     // Create workspace data object
//     const workspaceData = {
//       name: workspaceName,
//       description: workspaceDescription,
//       cancerType: this.cancerType,
//       variables: this.selectedVariables,
//       centers: this.selectedCenters,
//       creationDate: new Date().toISOString()
//     };
        
//     // TODO: Send the data to a service for persistence
//     this.metadataSearchService.createWorkspace(workspaceData).subscribe(
//       (response) => {
//         console.log('Workspace created successfully:', response);
//         this.showNotification(
//         "green",
//         "Workspace created successfully",
//         "bottom",
//         "center"
//       );
//       },
//       (error) => {
//         console.error('Error creating workspace:', error);
//         this.showNotification(
//           "black",
//           "Error creating workspace",
//           "bottom",
//           "center"
//         );
//       }
//     );
    
    
// }

backWorkspace() {
  this.metadataSearchFinished = false
}


 mapDetailedInformation(data: any) {
  let detailedDataMapped:any = [];
  // First, get all unique center names
  const centerNames = new Set<string>();
  data.forEach((variable: any) => {
    variable.centers.forEach((center: any) => {
      const centerName = Object.keys(center)[0];
      centerNames.add(centerName);
    });
  });
  
  // Then create the center objects with their variables
  centerNames.forEach(centerName => {
    const centerObject: any = {
      centerName: centerName,
      variables: []
    };
    
    // For each variable, find the data for this center
    data.forEach((variable: any) => {
      const centerData = variable.centers.find((center: any) => 
        Object.keys(center)[0] === centerName
      );
      
      if (centerData) {
        // Create a merged object with variable data and center-specific details
        centerObject.variables.push({
          ...variable,
          centerDetails: centerData[centerName]
        });
      }
    });
    
    detailedDataMapped.push(centerObject);
  });

  console.log("detailedDataMapped", detailedDataMapped);
  return detailedDataMapped;
 }


}




