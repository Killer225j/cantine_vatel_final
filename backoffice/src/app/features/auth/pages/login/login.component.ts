import { Component, inject, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { NgClass } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { environment } from '../../../../../environments/environment';
import { AuthService } from '../../../../core/services/auth.service';
import { ToastService } from '../../../../core/services/toast.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    NgClass,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatCheckboxModule,
  ],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private authService = inject(AuthService);
  private toastService = inject(ToastService);

  hidePassword = true;
  showRightPanel = signal(true);
  isLoading = signal(false);

  loginForm: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
    seSouvenir: [false],
  });

  /** Comptes de démonstration : un clic et on est connecté. */
  readonly comptesDemo = [
    { role: 'Admin', nom: 'Yann', email: 'admin@vatel.ci', icone: 'admin_panel_settings' },
    { role: 'Cuisine', nom: 'Bolou', email: 'cuisine@vatel.ci', icone: 'restaurant' },
  ];
  /** Vide tant que l'APK n'est pas publié. */
  readonly apkUrl = environment.apkUrl;
  demoEnCours = signal<string | null>(null);

  connecterDemo(email: string): void {
    if (this.isLoading()) return;
    this.demoEnCours.set(email);
    this.isLoading.set(true);
    this.authService.login(email, 'Cantine2026!', false).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.demoEnCours.set(null);
        this.router.navigate([this.authService.accueil()]);
      },
      error: (err: unknown) => {
        this.isLoading.set(false);
        this.demoEnCours.set(null);
        this.toastService.error(messageErreur(err), 4000);
      },
    });
  }

  togglePanel(): void {
    this.showRightPanel.update((v) => !v);
  }

  onSubmit(): void {
    if (this.loginForm.invalid || this.isLoading()) {
      this.loginForm.markAllAsTouched();
      return;
    }
    this.isLoading.set(true);
    const { email, password, seSouvenir } = this.loginForm.value;

    this.authService.login(email.trim(), password, seSouvenir).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.router.navigate([this.authService.accueil()]);
      },
      error: (err: unknown) => {
        this.isLoading.set(false);
        this.toastService.error(messageErreur(err), 4000);
      },
    });
  }
}

function messageErreur(err: unknown): string {
  if (err instanceof Error && err.message === 'ROLE_MOBILE') {
    return 'Compte élève ou parent : utilisez l’appli mobile Cantine Vatel.';
  }
  if (err instanceof HttpErrorResponse) {
    if (err.status === 401) return 'Adresse e-mail ou mot de passe incorrect.';
    if (err.status === 429) return 'Trop de tentatives. Réessayez dans quelques minutes.';
    if (err.status === 0) return 'Serveur injoignable. Vérifiez votre connexion.';
  }
  return 'La connexion a échoué. Réessayez.';
}
