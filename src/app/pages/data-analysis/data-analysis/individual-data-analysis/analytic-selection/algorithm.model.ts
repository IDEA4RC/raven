
export class Algorithm {
  id: number;
  method_name: string;
  description: string;
  creation_date: string;
  version_date: string;
  input: string;
  output: string;
  new_dataframe_vantage_id: number;
  task_id: number;
  status_task: string;
  subtask_id: number;
  status_subtask: string;

  constructor(Algorithm: any) {

    {
      this.id = Algorithm.id || 0;
      this.method_name = Algorithm.method_name || '';
      this.description = Algorithm.description || '';
      this.input = Algorithm.input || '';
      this.output = Algorithm.output || '';
      this.new_dataframe_vantage_id = Algorithm.new_dataframe_vantage_id || 0;
      this.task_id = Algorithm.task_id || 0;
      this.status_task = Algorithm.status_task || '';
      this.subtask_id = Algorithm.subtask_id || 0;
      this.status_subtask = Algorithm.status_subtask || '';
    }
  }
}