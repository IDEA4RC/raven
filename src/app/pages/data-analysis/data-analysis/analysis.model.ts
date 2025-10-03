
export class Analysis {
  id: number;
  analysis_name: string;
  analysis_description: string;
  creation_date: string;
  update_date: string;
  expiring_date: string;
  user_id: string;
  workspace_id: number;


  constructor(Analysis: any) { 
    
    {
      this.id = Analysis.id || 0;
      this.analysis_name = Analysis.analysis_name || '';
      this.analysis_description = Analysis.analysis_description || '';
      this.creation_date = Analysis.creation_date || '';
      this.update_date = Analysis.update_date || '';
      this.expiring_date = Analysis.expiring_date || '';
      this.user_id = Analysis.user_id || '';
      this.workspace_id = Analysis.workspace_id || 0;
    }
  }
 
}