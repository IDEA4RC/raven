
export class Cohort {
  id: number;
  cohort_name: string;
  cohort_description: string;
  creation_date: string;
  update_date: string;
  status: number;
  cohort_query: string;
  user_id: string;
  analysis_id: number;
  workspace_id: number;


  constructor(Cohort: any) { 
    
    {
      this.id = Cohort.id || 0;
      this.cohort_name = Cohort.cohort_name || '';
      this.cohort_description = Cohort.cohort_description || '';
      this.status = Cohort.status || 0;
      this.creation_date = Cohort.creation_date || '';
      this.update_date = Cohort.update_date || '';
      this.cohort_query = Cohort.cohort_query || '';
      this.user_id = Cohort.user_id || '';
      this.analysis_id = Cohort.analysis_id || 0;
      this.workspace_id = Cohort.workspace_id || 0;
    }
  }
 
}