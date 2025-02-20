import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VariablesSearcherComponent } from './variables-searcher.component';

describe('VariablesSearcherComponent', () => {
  let component: VariablesSearcherComponent;
  let fixture: ComponentFixture<VariablesSearcherComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VariablesSearcherComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(VariablesSearcherComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
