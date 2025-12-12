import { Component, EventEmitter, OnDestroy, OnInit, Output, ViewChild } from '@angular/core';
import { forkJoin, Observable } from 'rxjs';
import { DataAnalysisService } from '../../data-analysis.service';
import { Router } from '@angular/router';
import { SelectionService } from '../selection.service';
import { MatTableDataSource } from '@angular/material/table';

@Component({
  selector: 'app-data-preparation',
  templateUrl: './data-preparation.component.html',
  styleUrl: './data-preparation.component.scss'
})
export class DataPreparationComponent implements OnInit, OnDestroy {
  
  @Output() nextStep = new EventEmitter<void>();
  @Output() previousStep = new EventEmitter<void>();

  // Variable to store the current workspace ID from the route
  workspaceId: string | undefined;
  analysisId: string | undefined;


  
  allCohorts: any[] = []; // Loaded from cohort selection
  allCenters: any[] = [] // Loaded from cohort selection
  optionsVariables: { value: string; label: string, type: string }[] = []; // Loaded from metadata search

  // Variables for the filters
  selectedCenters: any[] = [];
  selectedCohorts: any[] = [];

  showCenters = true;
  showCohorts = true;
  variableList: any[] = [];
  summaryStatisticsCohorts: any[] = [];
  summaryStatisticsCenters: any[] = [];
  summaryTableCat : any[] = [
    { Statistics: 'N', field: "count", Total: 0},
    { Statistics: 'Missing', field: "missing", Total: 0 }
  ];
  summaryTableNum: any[] = [
    { Statistics: 'N', field: "count" },
    { Statistics: 'Mean', field: "mean" },
    { Statistics: 'Min', field: "min" },
    { Statistics: 'Max', field: "max" },
    { Statistics: 'Missing', field: "missing" },
  ];

  // Object to show the summary statistics by center
  centersTables: any = {};
   

  // Variable bound to the selected value
  selectedValue: any = null;

  

  // Table components
  dataSourceCohorts = new MatTableDataSource<any>();
  displayedColumnsCohorts: string[] = [];

  dataSourceCenters = new MatTableDataSource<any>();
  displayedColumnsCenters: string[] = [];

  // Observables cohort
  observable_coes_granted$ : Observable<any> | undefined;
  observable_data_preparation_cohort$ : Observable<any> | undefined;
  observable_data_preparation_center$ : Observable<any> | undefined;
  private coesGrantedSubscription: any;
  private dataPreparationSubscriptionCohort: any;
  private dataPreparationSubscriptionCenter: any;

  constructor(
      private dataAnalysisService: DataAnalysisService,
      private router: Router,
      private selectionService: SelectionService
  ) { }

  ngOnInit(): void {



    this.dataSourceCohorts.data = [
      { Statistics: 'N', Total: 1500, 'Cohort 1': 800, 'Cohort 2': 700 },
      { Statistics: 'Mean', Total: 45.5, 'Cohort 1': 46.2, 'Cohort 2': 44.8 },
      { Statistics: 'Median', Total: 44, 'Cohort 1': 45, 'Cohort 2': 43 },
      { Statistics: 'Min', Total: 18, 'Cohort 1': 19, 'Cohort 2': 18 },
      { Statistics: 'Max', Total: 80, 'Cohort 1': 78, 'Cohort 2': 80 },
      { Statistics: 'Std Dev', Total: 12.3, 'Cohort 1': 11.8, 'Cohort 2': 12.7 }
    ];


    // Extract workspace ID from the current URL
    const urlSegments = this.router.url.split('/');
    const workspaceIndex = urlSegments.indexOf('workspace');    
    
    if (workspaceIndex !== -1 && urlSegments.length > workspaceIndex + 1) {
      this.workspaceId = urlSegments[workspaceIndex + 1];

      forkJoin([
        this.dataAnalysisService.getCoEsGranted(this.workspaceId as unknown as number),
        this.dataAnalysisService.getMetadataSearch(this.workspaceId as unknown as number)
      ]).subscribe({
        next: ([data1, data2]) => {
          console.log('both finished', data1, data2);
          // continue your flow
          this.allCenters = data2[0].coes_granted.map((center: string) => ({
            center_name: center
          }));
          this.optionsVariables = data1;
        },
        error: err => console.error(err)
      });
    }

    // Subscribe to the observable from the service
    this.selectionService.selectedItems$.subscribe(items => {
      this.allCohorts = items;
      // TODO: Aquí puedes hacer cualquier cosa con los datos
      console.log(this.allCohorts);
    });

    this.observable_data_preparation_cohort$ = this.dataAnalysisService.data_preparation_cohort
    this.observable_data_preparation_center$ = this.dataAnalysisService.data_preparation_center


    // Subscribe to the observable data preparation by cohort
    this.dataPreparationSubscriptionCohort = this.observable_data_preparation_cohort$.subscribe((data:any) => {
      this.summaryStatisticsCohorts = data;
      this.updateCohortsTable();
    });
    // Subscribe to the observable data preparation by center
    this.dataPreparationSubscriptionCenter = this.observable_data_preparation_center$.subscribe((data:any) => {
      this.summaryStatisticsCenters = data;
      this.updateCentersTable();
    });

    
    // this.dataAnalysisService.getSummaryStatisticsCohort(this.allCohorts);
    // this.dataAnalysisService.getSummaryStatisticsCenter(this.allCenters);
  }

  ngOnDestroy(): void {
    // Unsubscribe from the observable to prevent memory leaks
    if (this.dataPreparationSubscriptionCohort) {
      this.dataPreparationSubscriptionCohort.unsubscribe();
    }
    if (this.dataPreparationSubscriptionCenter) {
      this.dataPreparationSubscriptionCenter.unsubscribe();
    }
  }
  
  goBack() {
    this.previousStep.emit();
  }
  goNext() {
    this.nextStep.emit();
  }
  onVariableSelected(value: any) {
    this.selectedValue = value;

    this.updateCohortsTable();
    this.updateCentersTable();
    
  }

  updateCohortsTable() {

    // Update the cohorts table based on the selected variable
    if(this.selectedValue) {
      let variableCohorts: any[] = [];
      if(this.selectedValue.type === 'categorical'){
        variableCohorts = [];

        // Reset displayed columns
        this.displayedColumnsCohorts = [];
        this.dataSourceCohorts.data = [];
        this.displayedColumnsCohorts.push(this.selectedValue.label);
        
        this.summaryStatisticsCohorts.forEach((statistic: any, index: number) => {
          const variableData = statistic.rps_cohort["counts_unique_values"][this.selectedValue.value];

          this.displayedColumnsCohorts.push( `Cohort ${index + 1}` );
          
          
          let variableValue = Object.keys(variableData);
          
          variableValue.forEach((val: any) => {
            // Skip N/A category (we'll handle it later)
            if (val === 'N/A') return;

            if(variableCohorts.length < variableValue.length ) {
              let row = { 
                [this.selectedValue.label]: val, 
                [`Cohort ${index + 1}`]: variableData[val]
              };
              variableCohorts.push(row);
            } else {
              variableCohorts = variableCohorts.map((row: any) => {
                if(row[this.selectedValue.label] === val){
                  row = {...row, [`Cohort ${index + 1}`]: variableData[val]};
                };
                return row;
              });
            }
            
          });
        });

        // === Add Total and Missing rows ===
        const totalRow: any = { [this.selectedValue.label]: 'Total' };
        const missingRow: any = { [this.selectedValue.label]: 'Missing' };

        // Compute totals and missings per cohort
        this.displayedColumnsCohorts.slice(1).forEach((cohortLabel: string, index: number) => {
          const variableData = this.summaryStatisticsCohorts[index].rps_cohort["counts_unique_values"][this.selectedValue.value];

          let total = 0;
          let missing = 0;

          Object.entries(variableData).forEach(([key, value]: [string, any]) => {
            if (key === 'N/A') missing += value;
            else total += value;
          });

          const totalPlusMissing = total + missing;
          const missingPerc = totalPlusMissing > 0 ? (missing / totalPlusMissing) * 100 : 0;

          totalRow[cohortLabel] = total;
          missingRow[cohortLabel] = `${missing} (${missingPerc.toFixed(1)}%)`;
        });

        // Add summary rows at the end
        variableCohorts.push(totalRow);
        variableCohorts.push(missingRow);

        
      } else if(this.selectedValue.type === 'numeric'){
        variableCohorts = this.summaryTableNum
        // Reset displayed columns
        this.displayedColumnsCohorts = [];
        this.dataSourceCohorts.data = [];
        this.displayedColumnsCohorts.push( 'Statistics' );
        this.summaryStatisticsCohorts.forEach((statistic: any, index: number) => {
          const variableData = statistic.rps_cohort[this.selectedValue.type][this.selectedValue.value];
          this.displayedColumnsCohorts.push( `Cohort ${index + 1}` );

          variableCohorts = variableCohorts.map((row: any) => {
            const cohortValue = variableData[row.field] || 0;
    
            // Keep existing cohorts and add the new one dynamically
            return {
              ...row,
              [`Cohort ${index + 1}`]: cohortValue
            };
          });
        
        });
      }
      
      // Update the data source for the cohorts table
      this.dataSourceCohorts.data = variableCohorts;
      this.dataSourceCohorts._updateChangeSubscription();
    }
    
  }

  updateCentersTable() {
    // Update the centers table based on the selected variable
    if(this.selectedValue) {
      let variableCenters: any[] = [];
      if(this.selectedValue.type === 'categorical') {
        // Reset displayed columns
          this.displayedColumnsCenters = [];
          this.dataSourceCenters.data = [];
          // Add Statistics as first column
          this.displayedColumnsCenters.push(this.selectedValue.label);

          let centersTable: any = {};

          let cohorts = Object.keys(this.summaryStatisticsCenters[0]);

          cohorts.forEach((cohort: any, index: number) => {
            variableCenters = [];

            let centers = Object.keys(this.summaryStatisticsCenters[0][cohort]);
             // Add center names to displayed columns (only once)
             if (index === 0) {
               this.displayedColumnsCenters.push(...centers);
             }

            // === Build variable rows per cohort ===
            centers.forEach((center: any) => {
              const variableData =
                this.summaryStatisticsCenters[0][cohort][center]["counts_unique_values"][this.selectedValue.value];

              const variableValues = Object.keys(variableData);

              variableValues.forEach((val: any) => {
                // Skip 'N/A' entries — will handle later in Missing
                if (val === "N/A") return;

                if (variableCenters.length < variableValues.length - (variableValues.includes("N/A") ? 1 : 0)) {
                  let row = {
                    [this.selectedValue.label]: val,
                    [center]: variableData[val],
                  };
                  variableCenters.push(row);
                } else {
                  variableCenters = variableCenters.map((row: any) => {
                    if (row[this.selectedValue.label] === val) {
                      row = { ...row, [center]: variableData[val] };
                    }
                    return row;
                  });
                }
              });
            });

            // === Add Total and Missing rows ===
            const totalRow: any = { [this.selectedValue.label]: "Total" };
            const missingRow: any = { [this.selectedValue.label]: "Missing" };

            centers.forEach((center: any) => {
              const variableData =
                this.summaryStatisticsCenters[0][cohort][center]["counts_unique_values"][this.selectedValue.value];

              let total = 0;
              let missing = 0;

              Object.entries(variableData).forEach(([key, value]: [string, any]) => {
                if (key === "N/A") missing += value;
                else total += value;
              });

              const totalPlusMissing = total + missing;
              const missingPerc = totalPlusMissing > 0 ? (missing / totalPlusMissing) * 100 : 0;

              totalRow[center] = total;
              missingRow[center] = `${missing} (${missingPerc.toFixed(1)}%)`;
            });

            // Append summary rows at the end
            variableCenters.push(totalRow);
            variableCenters.push(missingRow);

            // Save this cohort's centers table
            centersTable[cohort] = variableCenters;
          });
          this.centersTables = centersTable;
      } else
        if(this.selectedValue.type === 'numeric'){
          
          // Reset displayed columns
          this.displayedColumnsCenters = [];
          this.dataSourceCenters.data = [];
          // Add Statistics as first column
          this.displayedColumnsCenters.push( 'Statistics' );

          let centersTable: any = {};

          let cohorts = Object.keys(this.summaryStatisticsCenters[0]);

          cohorts.forEach((cohort: any, index: number) => {
            let variableCenters = [...this.summaryTableNum];
            let centers = Object.keys(this.summaryStatisticsCenters[0][cohort]);
             if (index === 0) {
               this.displayedColumnsCenters.push(...centers);
             }

            centers.forEach((center: any) => {
              const variableData =
                this.summaryStatisticsCenters[0][cohort][center][this.selectedValue.type][this.selectedValue.value];

              variableCenters = variableCenters.map((row: any) => {
                const centerValue = variableData[row.field] || 0;
                return {
                  ...row,
                  [center]: centerValue,
                };
              });
            });

            // Save this centers' table
            centersTable[cohort] = variableCenters;
          });

          console.log(centersTable);
          this.centersTables = centersTable;

      }
      
    }
  }
  onCentersChange(): void {
  //   // Get only selected centers
  //   this.selectedCenters = this.allCenters
  //     .filter(center => center.selected)
  //     .map(center => center.name);

  //   // this.updateVariableCenters();
  }

  onCohortsChange(): void {
  //   // Get only selected cohorts
  //   this.selectedCohorts = this.allCohorts
  //     .filter(cohort => cohort.selected)
  //     .map(cohort => cohort.cohort_name);
  //     console.log(this.selectedCohorts);
      

  //   // this.updateVariableCenters();
  }

  createVariable() {
    // Logic to create a new variable
    console.log('Create Variable button clicked');
  }
  // Function to get the keys of an object
  objectKeys(data: any){
    return Object.keys(data);
  }

}