
export class Algorithm {
  id: number;
  algorithm_name: string;
  algorithm_description: string;
  creation_date: string;
  update_date: string;
  status: number;
  Algorithm_query: string;
  user_id: string;
  analysis_id: number;
  workspace_id: number;


  constructor(Algorithm: any) { 
    
    {
      this.id = Algorithm.id || 0;
      this.algorithm_name = Algorithm.algorithm_name || '';
      this.algorithm_description = Algorithm.algorithm_description || '';
      this.status = Algorithm.status || 0;
      this.creation_date = Algorithm.creation_date || '';
      this.update_date = Algorithm.update_date || '';
      this.Algorithm_query = Algorithm.algorithm_query || '';
      this.user_id = Algorithm.user_id || '';
      this.analysis_id = Algorithm.analysis_id || 0;
      this.workspace_id = Algorithm.workspace_id || 0;
    }
  }
 
}