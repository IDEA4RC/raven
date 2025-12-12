import { Component, OnInit } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { DataAnalysisService } from '../../data-analysis.service';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-analysis-results',
  templateUrl: './analysis-results.component.html',
  styleUrl: './analysis-results.component.scss'
})
export class AnalysisResultsComponent implements OnInit {


  allCohorts: any[] = []; // Loaded from cohort selection
  allCenters: any[] = [
    {center_name: "APH P"},
    {center_name: "INT"},
    {center_name: "ISS-FJD"}
  ] // Loaded from cohort selection
  
  displayedColumns = ['id', 'name', 'status', 'org', 'user', 'created'];
  data = [
    { id: 450, name: 'Crosstabulation', status: 'Completed', org: 'INT', user: 'J. Perez', created: '21/11/2025' }
  ];

  subtasks = [
    { name: 'INT', status: 'Completed' },
    { name: 'ISS-FJF', status: 'Completed' },
    { name: 'APHP', status: 'Completed' }
  ];


  displayedColumns2: string[] = ['site', 'total', 'longBones', 'pelvis', 'ribs', 'spine'];

  dataTables:any[] = [
  {
    Pelvis: {
      contingency_table: [
        { fnclcc_grade: "Grade 1 tumor", MALE: "82", FEMALE: "84", Total: "166" },
        { fnclcc_grade: "Grade 2 tumor", MALE: "78", FEMALE: "106", Total: "184" },
        { fnclcc_grade: "Grade 3 tumor", MALE: "98", FEMALE: "114", Total: "212" },
        { fnclcc_grade: "N/A", MALE: "6", FEMALE: "4", Total: "10" },
        { fnclcc_grade: "Total", MALE: "264", FEMALE: "308", Total: "572" }
      ],
      chi2: { chi2: "2.522825698669517", "P-value": "0.4711800884562277" }
    },
    Pelvis_RPS: {
      contingency_table: [
        { fnclcc_grade: "Grade 1 tumor", MALE: "200", FEMALE: "208", Total: "408" },
        { fnclcc_grade: "Grade 2 tumor", MALE: "172", FEMALE: "208", Total: "380" },
        { fnclcc_grade: "Grade 3 tumor", MALE: "196", FEMALE: "204", Total: "400" },
        { fnclcc_grade: "N/A", MALE: "8", FEMALE: "4", Total: "12" },
        { fnclcc_grade: "Total", MALE: "576", FEMALE: "624", Total: "1200" }
      ],
      chi2: { chi2: "3.145755603185945", "P-value": "0.3696938750012461" }
    },
    RPS: {
      contingency_table: [
        { fnclcc_grade: "Grade 1 tumor", MALE: "118", FEMALE: "124", Total: "242" },
        { fnclcc_grade: "Grade 2 tumor", MALE: "94", FEMALE: "102", Total: "196" },
        { fnclcc_grade: "Grade 3 tumor", MALE: "98", FEMALE: "90", Total: "188" },
        { fnclcc_grade: "N/A", MALE: "2", FEMALE: "0", Total: "2" },
        { fnclcc_grade: "Total", MALE: "312", FEMALE: "316", Total: "628" }
      ],
      chi2: { chi2: "2.7903519711872944", "P-value": "0.4250906180348766" }
    }
  }
];


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

// Observables cohort
observable_data_summary_statistics$ : Observable<any> | undefined;
private dataSummaryStatisticsSubscription: any;

summaryStatistics: any;
optionsVariables: { value: string; label: string; type: string; }[];
displayedColumnsCohorts: string[] = [];

constructor(
  private dataAnalysisService: DataAnalysisService,
) { }
ngOnInit(): void {



  //TODO get variables
    // Example: load data dynamically (could be from a service)
    this.optionsVariables = [
      { "value": "AGE", "label": "Age", "type": "numeric" },
      { "value": "TUMOR_SIZE", "label": "Tumor Size", "type": "numeric" },
      { "value": "LOCAL_RECURRENCE", "label": "Local Recurrence", "type": "categorical" },
      { "value": "MULTIFOCALITY", "label": "Multifocality", "type": "categorical" },
      { "value": "STATUS", "label": "Status", "type": "categorical" },
      { "value": "PRE_OPERATIVE_RADIO", "label": "Pre Operative Radio", "type": "categorical" },
      { "value": "HISTOLOGY", "label": "Histology", "type": "categorical" },
      { "value": "POST_OPERATIVE_RADIO", "label": "Post Operative Radio", "type": "categorical" },
      { "value": "PRE_OPERATIVE_CHEMO", "label": "Pre Operative Chemo", "type": "categorical" },
      { "value": "POST_OPERATIVE_CHEMO", "label": "Post Operative Chemo", "type": "categorical" },
      { "value": "COMPLETENESS_OF_RESECTION", "label": "Completeness Of Resection", "type": "categorical" },
      { "value": "DISTANT_METASTASIS", "label": "Distant Metastasis", "type": "categorical" },
      { "value": "FNCLCC_GRADE", "label": "Fnclcc Grade", "type": "categorical" },
      { "value": "TUMOR_RUPTURE", "label": "Tumor Rupture", "type": "categorical" },
      { "value": "SEX", "label": "Sex", "type": "categorical" }
    ];

  this.observable_data_summary_statistics$ = this.dataAnalysisService.data_summary_statistics


  // Subscribe to the observable summary statistics
  this.dataSummaryStatisticsSubscription = this.observable_data_summary_statistics$.subscribe((data:any) => {
    this.summaryStatistics = data;
    this.updateCohortsTable();
  });
  

  //TODO remove hardcoded taskId
  let taskId = 1;
  // Initial data fetch
  this.dataAnalysisService.getSummaryStatistics(taskId);
  
}

getTableKeys(): any[] {
  return Object.keys(this.dataTables[0]) as any[];
}

updateCohortsTable() {

    // Update the cohorts table based on the selected variable
    let variableCohorts: any[] = [];

    // Handle numeric and categoric variables separately      

    let cohorts = Object.keys(this.summaryStatistics[0].by_cohort);
    
    cohorts.forEach((cohort: any, index: number) => {
      
      let numVariables = Object.keys(this.summaryStatistics[0]["by_cohort"][cohort]["numeric"]);
      let catVariables = Object.keys(this.summaryStatistics[0]["by_cohort"][cohort]["counts_unique_values"]);

      console.log("numVariables:", numVariables);
      
      
      // Numeric variables
      this.displayedColumnsCohorts = [];
      // this.dataSourceCohorts.data = [];
      this.displayedColumnsCohorts.push( 'Statistics' );
      variableCohorts = numVariables
     
      numVariables.forEach((variable: any, index: number) => {

        // Create a fresh copy of the statistics template
        let variableCohorts = [...this.summaryTableNum.map(item => ({ ...item }))];

        // Get data for this variable
        const variableData = this.summaryStatistics[0]["by_cohort"][cohort]["numeric"][variable];

        // Add new displayed column
        this.displayedColumnsCohorts.push(`Cohort ${index + 1}`);

        // Add cohort value to each statistics row
        variableCohorts = variableCohorts.map((row: any) => {
          const cohortValue = variableData[row.field] ?? 0;
          return {
            ...row,
            [`Cohort ${index + 1}`]: cohortValue
          };
        });

        console.log("variableCohorts for", variable, variableCohorts);
      });

      console.log("displayed columns:", this.displayedColumnsCohorts);
      

    });

    console.log("variableCohorts:", variableCohorts);
      

      // if(this.selectedValue.type === 'categorical'){
      //   variableCohorts = [];

      //   // Reset displayed columns
      //   this.displayedColumnsCohorts = [];
      //   this.dataSourceCohorts.data = [];
      //   this.displayedColumnsCohorts.push(this.selectedValue.label);
        
      //   this.summaryStatisticsCohorts.forEach((statistic: any, index: number) => {
      //     const variableData = statistic.rps_cohort["counts_unique_values"][this.selectedValue.value];

      //     this.displayedColumnsCohorts.push( `Cohort ${index + 1}` );
          
          
      //     let variableValue = Object.keys(variableData);
          
      //     variableValue.forEach((val: any) => {
      //       // Skip N/A category (we'll handle it later)
      //       if (val === 'N/A') return;

      //       if(variableCohorts.length < variableValue.length ) {
      //         let row = { 
      //           [this.selectedValue.label]: val, 
      //           [`Cohort ${index + 1}`]: variableData[val]
      //         };
      //         variableCohorts.push(row);
      //       } else {
      //         variableCohorts = variableCohorts.map((row: any) => {
      //           if(row[this.selectedValue.label] === val){
      //             row = {...row, [`Cohort ${index + 1}`]: variableData[val]};
      //           };
      //           return row;
      //         });
      //       }
            
      //     });
      //   });

      //   // === Add Total and Missing rows ===
      //   const totalRow: any = { [this.selectedValue.label]: 'Total' };
      //   const missingRow: any = { [this.selectedValue.label]: 'Missing' };

      //   // Compute totals and missings per cohort
      //   this.displayedColumnsCohorts.slice(1).forEach((cohortLabel: string, index: number) => {
      //     const variableData = this.summaryStatisticsCohorts[index].rps_cohort["counts_unique_values"][this.selectedValue.value];

      //     let total = 0;
      //     let missing = 0;

      //     Object.entries(variableData).forEach(([key, value]: [string, any]) => {
      //       if (key === 'N/A') missing += value;
      //       else total += value;
      //     });

      //     const totalPlusMissing = total + missing;
      //     const missingPerc = totalPlusMissing > 0 ? (missing / totalPlusMissing) * 100 : 0;

      //     totalRow[cohortLabel] = total;
      //     missingRow[cohortLabel] = `${missing} (${missingPerc.toFixed(1)}%)`;
      //   });

      //   // Add summary rows at the end
      //   variableCohorts.push(totalRow);
      //   variableCohorts.push(missingRow);

        
      // }
      
      // Update the data source for the cohorts table
      // this.dataSourceCohorts.data = variableCohorts;
      // this.dataSourceCohorts._updateChangeSubscription();
    
    
  }

  // updateCentersTable() {
  //   // Update the centers table based on the selected variable
  //   if(this.selectedValue) {
  //     let variableCenters: any[] = [];
  //     if(this.selectedValue.type === 'categorical') {
  //       // Reset displayed columns
  //         this.displayedColumnsCenters = [];
  //         this.dataSourceCenters.data = [];
  //         // Add Statistics as first column
  //         this.displayedColumnsCenters.push(this.selectedValue.label);

  //         let centersTable: any = {};

  //         let cohorts = Object.keys(this.summaryStatisticsCenters[0]);

  //         cohorts.forEach((cohort: any, index: number) => {
  //           variableCenters = [];

  //           let centers = Object.keys(this.summaryStatisticsCenters[0][cohort]);
  //            // Add center names to displayed columns (only once)
  //            if (index === 0) {
  //              this.displayedColumnsCenters.push(...centers);
  //            }

  //           // === Build variable rows per cohort ===
  //           centers.forEach((center: any) => {
  //             const variableData =
  //               this.summaryStatisticsCenters[0][cohort][center]["counts_unique_values"][this.selectedValue.value];

  //             const variableValues = Object.keys(variableData);

  //             variableValues.forEach((val: any) => {
  //               // Skip 'N/A' entries — will handle later in Missing
  //               if (val === "N/A") return;

  //               if (variableCenters.length < variableValues.length - (variableValues.includes("N/A") ? 1 : 0)) {
  //                 let row = {
  //                   [this.selectedValue.label]: val,
  //                   [center]: variableData[val],
  //                 };
  //                 variableCenters.push(row);
  //               } else {
  //                 variableCenters = variableCenters.map((row: any) => {
  //                   if (row[this.selectedValue.label] === val) {
  //                     row = { ...row, [center]: variableData[val] };
  //                   }
  //                   return row;
  //                 });
  //               }
  //             });
  //           });

  //           // === Add Total and Missing rows ===
  //           const totalRow: any = { [this.selectedValue.label]: "Total" };
  //           const missingRow: any = { [this.selectedValue.label]: "Missing" };

  //           centers.forEach((center: any) => {
  //             const variableData =
  //               this.summaryStatisticsCenters[0][cohort][center]["counts_unique_values"][this.selectedValue.value];

  //             let total = 0;
  //             let missing = 0;

  //             Object.entries(variableData).forEach(([key, value]: [string, any]) => {
  //               if (key === "N/A") missing += value;
  //               else total += value;
  //             });

  //             const totalPlusMissing = total + missing;
  //             const missingPerc = totalPlusMissing > 0 ? (missing / totalPlusMissing) * 100 : 0;

  //             totalRow[center] = total;
  //             missingRow[center] = `${missing} (${missingPerc.toFixed(1)}%)`;
  //           });

  //           // Append summary rows at the end
  //           variableCenters.push(totalRow);
  //           variableCenters.push(missingRow);

  //           // Save this cohort's centers table
  //           centersTable[cohort] = variableCenters;
  //         });
  //         this.centersTables = centersTable;
  //     } else
  //       if(this.selectedValue.type === 'numeric'){
          
  //         // Reset displayed columns
  //         this.displayedColumnsCenters = [];
  //         this.dataSourceCenters.data = [];
  //         // Add Statistics as first column
  //         this.displayedColumnsCenters.push( 'Statistics' );

  //         let centersTable: any = {};

  //         let cohorts = Object.keys(this.summaryStatisticsCenters[0]);

  //         cohorts.forEach((cohort: any, index: number) => {
  //           let variableCenters = [...this.summaryTableNum];
  //           let centers = Object.keys(this.summaryStatisticsCenters[0][cohort]);
  //            if (index === 0) {
  //              this.displayedColumnsCenters.push(...centers);
  //            }

  //           centers.forEach((center: any) => {
  //             const variableData =
  //               this.summaryStatisticsCenters[0][cohort][center][this.selectedValue.type][this.selectedValue.value];

  //             variableCenters = variableCenters.map((row: any) => {
  //               const centerValue = variableData[row.field] || 0;
  //               return {
  //                 ...row,
  //                 [center]: centerValue,
  //               };
  //             });
  //           });

  //           // Save this centers' table
  //           centersTable[cohort] = variableCenters;
  //         });

  //         console.log(centersTable);
  //         this.centersTables = centersTable;

  //     }
      
  //   }
  // }



  // dataSource = new MatTableDataSource<any>([
  //   { site: 'Cohort 1 - No metastatic', total: 305, longBones: '79 (25.90%)', pelvis: '70 (22.95%)', ribs: '73 (23.93%)', spine: '83 (27.21%)' },
  //   { site: 'Cohort 1 - Metastatic', total: 139, longBones: '32 (23.02%)', pelvis: '41 (29.50%)', ribs: '38 (27.34%)', spine: '28 (20.14%)', alt: true },
  //   { site: 'Cohort 2 - No metastatic', total: 410, longBones: '99 (24.15%)', pelvis: '107 (26.10%)', ribs: '97 (23.66%)', spine: '107 (26.10%)' },
  //   { site: 'Cohort 2 - Metastatic', total: 190, longBones: '51 (26.84%)', pelvis: '43 (22.63%)', ribs: '53 (27.89%)', spine: '43 (22.63%)', alt: true }
  // ]);

}
