import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DetailAnalysisTableComponent } from './detail-analysis-table.component';

describe('DetailAnalysisTableComponent', () => {
  let component: DetailAnalysisTableComponent;
  let fixture: ComponentFixture<DetailAnalysisTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DetailAnalysisTableComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(DetailAnalysisTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
