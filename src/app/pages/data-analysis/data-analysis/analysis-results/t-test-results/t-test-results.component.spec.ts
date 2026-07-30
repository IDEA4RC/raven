import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TTestResultsComponent } from './t-test-results.component';

describe('TTestResultsComponent', () => {
  let component: TTestResultsComponent;
  let fixture: ComponentFixture<TTestResultsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TTestResultsComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(TTestResultsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
