import { Component, input } from '@angular/core';

export interface ProgressStampStep {
  label: string;
  state: 'done' | 'current' | 'upcoming';
}

@Component({
  selector: 'app-progress-stamp',
  standalone: true,
  imports: [],
  templateUrl: './progress-stamp.component.html',
  styleUrl: './progress-stamp.component.scss',
})
export class ProgressStampComponent {
  steps = input.required<ProgressStampStep[]>();
}
