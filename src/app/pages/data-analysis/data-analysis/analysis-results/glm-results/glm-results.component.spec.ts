import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GlmResultsComponent } from './glm-results.component';

describe('GlmResultsComponent', () => {
  let component: GlmResultsComponent;
  let fixture: ComponentFixture<GlmResultsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GlmResultsComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(GlmResultsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
