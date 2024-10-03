import {
  Component,
  OnInit,
  Input,
} from '@angular/core';
import { Router } from '@angular/router';
import { NavService } from '../../../../../services/nav.service';
import { MaterialModule } from 'src/app/material.module';
import { TablerIconsModule } from 'angular-tabler-icons';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-horizontal-nav-item',
  standalone: true,
  imports:[MaterialModule, TablerIconsModule, CommonModule],
  templateUrl: './nav-item.component.html',
})
export class AppHorizontalNavItemComponent implements OnInit {
  @Input() depth: any;
  @Input() item: any;

  constructor(public navService: NavService, public router: Router) {
    if (this.depth === undefined) {
      this.depth = 0;
    }
  }

  ngOnInit() {}
  onItemSelected(item: any) {
    if (!item.children || !item.children.length) {
      this.router.navigate([item.route]);
    }
  }
}
