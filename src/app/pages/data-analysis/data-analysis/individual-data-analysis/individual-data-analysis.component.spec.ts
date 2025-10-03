import { ComponentFixture, TestBed } from '@angular/core/testing';

import { IndividualDataAnalysisComponent } from './individual-data-analysis.component';

describe('IndividualDataAnalysisComponent', () => {
  let component: IndividualDataAnalysisComponent;
  let fixture: ComponentFixture<IndividualDataAnalysisComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [IndividualDataAnalysisComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(IndividualDataAnalysisComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
