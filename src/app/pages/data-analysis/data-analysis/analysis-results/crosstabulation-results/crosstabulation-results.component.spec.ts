import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CrosstabulationResultsComponent } from './crosstabulation-results.component';

describe('CrosstabulationResultsComponent', () => {
  let component: CrosstabulationResultsComponent;
  let fixture: ComponentFixture<CrosstabulationResultsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CrosstabulationResultsComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(CrosstabulationResultsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
