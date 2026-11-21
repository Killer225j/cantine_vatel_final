import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  imports: [],
  templateUrl: './empty-state.component.html',
  styleUrl: './empty-state.component.scss',
})
export class EmptyStateComponent {
  icon = input('pi-inbox');
  title = input.required<string>();
  message = input('');
  actionLabel = input('');
  action = output<void>();
}
