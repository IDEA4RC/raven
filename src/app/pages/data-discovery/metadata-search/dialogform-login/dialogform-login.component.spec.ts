import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DialogformLoginComponent } from './dialogform-login.component';

describe('DialogformLoginComponent', () => {
  let component: DialogformLoginComponent;
  let fixture: ComponentFixture<DialogformLoginComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DialogformLoginComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(DialogformLoginComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
