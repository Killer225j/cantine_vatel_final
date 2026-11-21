import { Component, input, output } from '@angular/core';

export type ButtonVariant = 'primary' | 'outline' | 'ghost' | 'danger';

@Component({
  selector: 'app-button',
  standalone: true,
  imports: [],
  templateUrl: './button.component.html',
  styleUrl: './button.component.scss',
})
export class ButtonComponent {
  variant = input<ButtonVariant>('primary');
  disabled = input(false);
  type = input<'button' | 'submit'>('button');
  clicked = output<void>();

  onClick(): void {
    if (this.disabled()) return;
    this.clicked.emit();
  }
}
