import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VariablesTableComponent } from './variables-table.component';

describe('VariablesTableComponent', () => {
  let component: VariablesTableComponent;
  let fixture: ComponentFixture<VariablesTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VariablesTableComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(VariablesTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
