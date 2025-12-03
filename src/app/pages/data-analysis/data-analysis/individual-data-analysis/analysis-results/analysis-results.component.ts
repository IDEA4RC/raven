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

// Observables cohort
observable_data_preparation_cohort$ : Observable<any> | undefined;
observable_data_preparation_center$ : Observable<any> | undefined;
private dataPreparationSubscriptionCohort: any;
private dataPreparationSubscriptionCenter: any;

constructor(
  private dataAnalysisService: DataAnalysisService,
) { }
ngOnInit(): void {

  this.observable_data_preparation_cohort$ = this.dataAnalysisService.data_preparation_cohort
  this.observable_data_preparation_center$ = this.dataAnalysisService.data_preparation_center

  // Subscribe to the observable data preparation by cohort
  this.dataPreparationSubscriptionCohort = this.observable_data_preparation_cohort$.subscribe((data:any) => {
    // this.summaryStatisticsCohorts = data;
    // this.updateCohortsTable();
  });
  // Subscribe to the observable data preparation by center
  this.dataPreparationSubscriptionCenter = this.observable_data_preparation_center$.subscribe((data:any) => {
    // this.summaryStatisticsCenters = data;
    // this.updateCentersTable();
  });

  // Initial data fetch
  this.dataAnalysisService.getSummaryStatisticsCohort(this.allCohorts);
  this.dataAnalysisService.getSummaryStatisticsCenter(this.allCenters);
  
}

getTableKeys(): any[] {
  return Object.keys(this.dataTables[0]) as any[];
}



  // dataSource = new MatTableDataSource<any>([
  //   { site: 'Cohort 1 - No metastatic', total: 305, longBones: '79 (25.90%)', pelvis: '70 (22.95%)', ribs: '73 (23.93%)', spine: '83 (27.21%)' },
  //   { site: 'Cohort 1 - Metastatic', total: 139, longBones: '32 (23.02%)', pelvis: '41 (29.50%)', ribs: '38 (27.34%)', spine: '28 (20.14%)', alt: true },
  //   { site: 'Cohort 2 - No metastatic', total: 410, longBones: '99 (24.15%)', pelvis: '107 (26.10%)', ribs: '97 (23.66%)', spine: '107 (26.10%)' },
  //   { site: 'Cohort 2 - Metastatic', total: 190, longBones: '51 (26.84%)', pelvis: '43 (22.63%)', ribs: '53 (27.89%)', spine: '43 (22.63%)', alt: true }
  // ]);

}
