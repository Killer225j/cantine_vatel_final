import { Component, input } from '@angular/core';

@Component({
  selector: 'app-stat-tile',
  standalone: true,
  imports: [],
  templateUrl: './stat-tile.component.html',
  styleUrl: './stat-tile.component.scss',
})
export class StatTileComponent {
  value = input.required<string | number>();
  label = input.required<string>();
}
