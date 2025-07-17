import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DialogformDeleteComponent } from './dialogform-delete.component';

describe('DialogformDeleteComponent', () => {
  let component: DialogformDeleteComponent;
  let fixture: ComponentFixture<DialogformDeleteComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DialogformDeleteComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(DialogformDeleteComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
