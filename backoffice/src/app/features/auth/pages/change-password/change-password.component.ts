import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { apiErrorMessage } from '../../../../core/utils/http-error.utils';

@Component({
  selector: 'app-change-password',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './change-password.component.html',
  styleUrl: './change-password.component.scss',
})
export class ChangePasswordComponent {
  private authService = inject(AuthService);
  private router      = inject(Router);

  currentPassword = '';
  newPassword     = '';
  confirmPassword = '';

  showCurrent = signal(false);
  showNew     = signal(false);
  showConfirm = signal(false);
  loading     = signal(false);
  error       = signal('');
  success     = signal(false);

  toggleCurrent(): void { this.showCurrent.set(!this.showCurrent()); }
  toggleNew():     void { this.showNew.set(!this.showNew()); }
  toggleConfirm(): void { this.showConfirm.set(!this.showConfirm()); }

  get canSubmit(): boolean {
    return !!this.currentPassword && !!this.newPassword && !!this.confirmPassword
      && this.newPassword.length >= 8
      && this.newPassword === this.confirmPassword;
  }

  onSubmit(): void {
    if (!this.canSubmit) return;

    if (this.newPassword !== this.confirmPassword) {
      this.error.set('Les mots de passe ne correspondent pas.');
      return;
    }

    this.loading.set(true);
    this.error.set('');

    this.authService.changePassword(this.currentPassword, this.newPassword).subscribe({
      next: () => {
        this.loading.set(false);
        this.success.set(true);

        setTimeout(() => this.router.navigate(['/dashboard']), 1500);
      },
      error: (err) => {
        this.loading.set(false);
        this.error.set(apiErrorMessage(err, 'Mot de passe actuel incorrect.'));
      },
    });
  }
}
