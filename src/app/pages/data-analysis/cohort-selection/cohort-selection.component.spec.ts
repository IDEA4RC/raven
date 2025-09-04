import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CohortSelectionComponent } from './cohort-selection.component';

describe('CohortSelectionComponent', () => {
  let component: CohortSelectionComponent;
  let fixture: ComponentFixture<CohortSelectionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CohortSelectionComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(CohortSelectionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
