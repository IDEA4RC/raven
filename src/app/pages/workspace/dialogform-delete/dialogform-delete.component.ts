import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { WorkspaceService } from '../workspace.service';


@Component({
  selector: 'app-dialogform-delete',
  templateUrl: './dialogform-delete.component.html',
  styleUrl: './dialogform-delete.component.scss'
})
export class DialogformDeleteComponent implements OnInit {

  constructor(
    private workspaceService: WorkspaceService,
    private dialogRef: MatDialogRef<DialogformDeleteComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any) {}

  ngOnInit(): void {
    console.log('DialogformDeleteComponent initialized with data:', this.data);
    
  }

  onCancel() {
    // Handle cancel action
    console.log('Form cancelled');
    this.dialogRef.close();
  }

  // Function to delete the workspace
  delete() {
    this.workspaceService.deleteWorkspace(this.data.workspace_id).subscribe({
      next: () => {
        console.log('Workspace deleted successfully');
        // Close the dialog after successful deletion
        this.dialogRef.close(true);
      }, error: (err: any) => {
        console.error('Error deleting workspace:', err);
        this.dialogRef.close(false);
      }
    });
  }

}
