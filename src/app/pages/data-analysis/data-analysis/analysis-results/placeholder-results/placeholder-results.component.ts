import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-placeholder-results',

  templateUrl: './placeholder-results.component.html',
  styleUrl: './placeholder-results.component.scss'
})
export class PlaceholderResultsComponent {
  @Input() algorithmName = '';
  @Input() message = 'This algorithm renderer is not implemented yet.';

  formatLabel(value: string): string {
    return String(value || '')
      .replace(/_/g, ' ')
      .replace(/\b\w/g, char => char.toUpperCase());
  }

}
