import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MetadataSearchComponent } from './metadata-search.component';

describe('MetadataSearchComponent', () => {
  let component: MetadataSearchComponent;
  let fixture: ComponentFixture<MetadataSearchComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MetadataSearchComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(MetadataSearchComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
