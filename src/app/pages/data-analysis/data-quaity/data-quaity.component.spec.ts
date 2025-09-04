import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DataQuaityComponent } from './data-quaity.component';

describe('DataQuaityComponent', () => {
  let component: DataQuaityComponent;
  let fixture: ComponentFixture<DataQuaityComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DataQuaityComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(DataQuaityComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
