
export class WorkspaceHistory {
  id: number;
  date: string;
  time: string;
  action: string;
  phase: string;
  details: string;

  constructor(WorkspaceHistory: any) { 
    
    {
      this.id = WorkspaceHistory.id || 0;
      this.date = WorkspaceHistory.date || '';
      this.time = WorkspaceHistory.time || '';
      this.action = WorkspaceHistory.action || '';
      this.phase = WorkspaceHistory.phase || '';
      this.details = WorkspaceHistory.details || '';
    }
  }
 
}
