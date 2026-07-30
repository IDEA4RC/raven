import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Table1ResultsComponent } from './table1-results.component';

describe('Table1ResultsComponent', () => {
  let component: Table1ResultsComponent;
  let fixture: ComponentFixture<Table1ResultsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Table1ResultsComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(Table1ResultsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
