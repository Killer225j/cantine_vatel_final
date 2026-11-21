import { Component, output, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { AuthService } from '../../../../core/services/auth.service';
import { apiErrorMessage } from '../../../../core/utils/http-error.utils';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [
    RouterLink, FormsModule,
    MatToolbarModule, MatIconModule, MatButtonModule,
    MatMenuModule, MatDividerModule,
  ],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss',
})
export class HeaderComponent {
  toggleSidebar = output<void>();

  private authService = inject(AuthService);
  private router      = inject(Router);

  currentUser = this.authService.currentUser;

  // ─── Modal changement de mot de passe ─────────────────────────────────────
  showModal    = signal(false);
  isSubmitting = signal(false);
  successMsg   = signal('');
  errorMsg     = signal('');
  currentPwd   = '';
  newPwd       = '';
  confirmPwd   = '';

  openModal(): void {
    this.currentPwd  = '';
    this.newPwd      = '';
    this.confirmPwd  = '';
    this.errorMsg.set('');
    this.successMsg.set('');
    this.showModal.set(true);
  }

  closeModal(): void { this.showModal.set(false); }

  onChangePassword(): void {
    if (!this.currentPwd || !this.newPwd || !this.confirmPwd) {
      this.errorMsg.set('Tous les champs sont obligatoires.');
      return;
    }
    if (this.newPwd !== this.confirmPwd) {
      this.errorMsg.set('Les mots de passe ne correspondent pas.');
      return;
    }
    this.isSubmitting.set(true);
    this.errorMsg.set('');
    this.authService.changePassword(this.currentPwd, this.newPwd).subscribe({
      next: () => {
        this.isSubmitting.set(false);
        this.successMsg.set('Mot de passe modifié avec succès.');
        setTimeout(() => this.closeModal(), 1500);
      },
      error: (err: unknown) => {
        this.isSubmitting.set(false);
        this.errorMsg.set(apiErrorMessage(err, 'Ancien mot de passe incorrect.'));
      },
    });
  }

  getRoleLabel(): string {
    return this.authService.getRoleLabel(this.currentUser()?.role);
  }

  onToggleSidebar(): void { this.toggleSidebar.emit(); }

  onLogout(): void {
    this.authService.logout();
    this.router.navigate(['/auth/login']);
  }
}
