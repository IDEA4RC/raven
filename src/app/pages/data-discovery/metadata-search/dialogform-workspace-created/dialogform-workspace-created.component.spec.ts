import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DialogformWorkspaceCreatedComponent } from './dialogform-workspace-created.component';

describe('DialogformWorkspaceCreatedComponent', () => {
  let component: DialogformWorkspaceCreatedComponent;
  let fixture: ComponentFixture<DialogformWorkspaceCreatedComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DialogformWorkspaceCreatedComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(DialogformWorkspaceCreatedComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
