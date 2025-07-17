
export class Workspace {
  id: number;
  name: string;
  description: string;
  status: string | number;
  creation_date: string;
  creator_id: string;
  update_date?: string;
  metadata_search?: number;
  data_access?: number;
  data_analysis?: number;
  result_report?: number;
  v6_study_id?: string;

  constructor(Workspace: any) { 
    
    {
      this.id = Workspace.id || 0;
      this.name = Workspace.name || '';
      this.description = Workspace.description || '';
      this.status = Workspace.status || '';
      this.creation_date = Workspace.creation_date || '';
      this.creator_id = Workspace.creator_id || '';
      this.update_date = Workspace.update_date || '';
      this.metadata_search = Workspace.metadata_search || 0;
      this.data_access = Workspace.data_access || 0;
      this.data_analysis = Workspace.data_analysis || 0;
      this.result_report = Workspace.result_report || 0;
      this.v6_study_id = Workspace.v6_study_id || '';
    }
  }
 
}