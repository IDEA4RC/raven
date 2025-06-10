import { ComponentFixture, TestBed } from '@angular/core/testing';

import { IndividualWokspaceComponent } from './individual-wokspace.component';

describe('IndividualWokspaceComponent', () => {
  let component: IndividualWokspaceComponent;
  let fixture: ComponentFixture<IndividualWokspaceComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [IndividualWokspaceComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(IndividualWokspaceComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
