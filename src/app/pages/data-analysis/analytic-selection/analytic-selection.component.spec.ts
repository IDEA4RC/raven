import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AnalyticSelectionComponent } from './analytic-selection.component';

describe('AnalyticSelectionComponent', () => {
  let component: AnalyticSelectionComponent;
  let fixture: ComponentFixture<AnalyticSelectionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AnalyticSelectionComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(AnalyticSelectionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
