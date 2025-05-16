import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WorkspaceHistoryTableComponent } from './workspace-history-table.component';

describe('WorkspaceHistoryTableComponent', () => {
  let component: WorkspaceHistoryTableComponent;
  let fixture: ComponentFixture<WorkspaceHistoryTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WorkspaceHistoryTableComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(WorkspaceHistoryTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
