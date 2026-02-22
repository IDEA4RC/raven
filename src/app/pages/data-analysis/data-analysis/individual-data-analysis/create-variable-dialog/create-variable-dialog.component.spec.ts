import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CreateVariableDialogComponent } from './create-variable-dialog.component';

describe('CreateVariableDialogComponent', () => {
  let component: CreateVariableDialogComponent;
  let fixture: ComponentFixture<CreateVariableDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CreateVariableDialogComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(CreateVariableDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
