import { ComponentFixture, TestBed } from '@angular/core/testing';

import { KaplanMeierResultsComponent } from './kaplan-meier-results.component';

describe('KaplanMeierResultsComponent', () => {
  let component: KaplanMeierResultsComponent;
  let fixture: ComponentFixture<KaplanMeierResultsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [KaplanMeierResultsComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(KaplanMeierResultsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
