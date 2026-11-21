import { Component, input } from '@angular/core';

export type BadgeColor = 'info' | 'warning' | 'success' | 'error' | 'neutral';

@Component({
  selector: 'app-badge',
  standalone: true,
  imports: [],
  templateUrl: './badge.component.html',
  styleUrl: './badge.component.scss',
})
export class BadgeComponent {
  color = input<BadgeColor>('neutral');
}
