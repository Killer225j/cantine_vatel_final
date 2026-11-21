import { Component, inject, signal, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService, CurrentUser, LIBELLE_ROLE } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss',
})
export class ProfileComponent implements OnInit {
  private authService = inject(AuthService);

  user    = signal<CurrentUser | null>(null);
  loading = signal(true);
  error   = signal('');

  libelleRole(): string {
    const role = this.user()?.role;
    return role ? LIBELLE_ROLE[role] : '';
  }

  ngOnInit(): void {
    this.authService.loadProfile().subscribe({
      next: (u) => {
        this.user.set(u);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Impossible de charger le profil.');
        this.loading.set(false);
      },
    });
  }
}
