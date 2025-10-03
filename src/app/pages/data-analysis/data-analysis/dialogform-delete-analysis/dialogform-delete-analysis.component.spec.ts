import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DialogformDeleteAnalysisComponent } from './dialogform-delete-analysis.component';

describe('DialogformDeleteAnalysisComponent', () => {
  let component: DialogformDeleteAnalysisComponent;
  let fixture: ComponentFixture<DialogformDeleteAnalysisComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DialogformDeleteAnalysisComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(DialogformDeleteAnalysisComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
