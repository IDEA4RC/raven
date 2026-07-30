import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CoxPHResultsComponent } from './cox-ph-results.component';

describe('CoxPHResultsComponent', () => {
  let component: CoxPHResultsComponent;
  let fixture: ComponentFixture<CoxPHResultsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CoxPHResultsComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(CoxPHResultsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
