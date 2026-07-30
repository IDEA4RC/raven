import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PlaceholderResultsComponent } from './placeholder-results.component';

describe('PlaceholderResultsComponent', () => {
  let component: PlaceholderResultsComponent;
  let fixture: ComponentFixture<PlaceholderResultsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PlaceholderResultsComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(PlaceholderResultsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
