import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { DataAnalysisService } from '../data-analysis.service';

@Component({
  selector: 'app-dialogform-delete-analysis',
  templateUrl: './dialogform-delete-analysis.component.html',
  styleUrl: './dialogform-delete-analysis.component.scss'
})
export class DialogformDeleteAnalysisComponent implements OnInit {


  constructor(
    private dataAnalysisService: DataAnalysisService,
    private dialogRef: MatDialogRef<DialogformDeleteAnalysisComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any) {}

  ngOnInit(): void {
    console.log('DialogformDeleteComponent initialized with data:', this.data);
    
  }

  onCancel() {
    // Handle cancel action
    console.log('Form cancelled');
    this.dialogRef.close();
  }

  // Function to delete the analysis
  delete() {
    this.dataAnalysisService.deleteAnalysis(this.data.analysis_id).subscribe({
      next: () => {
        console.log('Analysis deleted successfully');
        // Close the dialog after successful deletion
        this.dialogRef.close(true);
      }, error: (err: any) => {
        console.error('Error deleting analysis:', err);
        this.dialogRef.close(false);
      }
    });
  }

}
