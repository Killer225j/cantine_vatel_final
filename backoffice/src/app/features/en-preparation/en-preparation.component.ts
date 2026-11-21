import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CardComponent } from '../../shared/components/ui/card/card.component';
import { EmptyStateComponent } from '../../shared/components/ui/empty-state/empty-state.component';

/** Page d'une section du menu pas encore construite : titre, rôle de l'écran, état vide. */
@Component({
  selector: 'app-en-preparation',
  standalone: true,
  imports: [CardComponent, EmptyStateComponent],
  template: `
    <div class="max-w-5xl">
      <h1 class="text-2xl font-bold text-gray-900 mb-1">{{ titre }}</h1>
      <p class="text-sm text-gray-500 mb-6">{{ description }}</p>
      <app-card>
        <app-empty-state
          [icon]="icone"
          title="Écran en préparation"
          message="Cette section arrive avec le modèle de données de la cantine."
        />
      </app-card>
    </div>
  `,
})
export class EnPreparationComponent {
  private data = inject(ActivatedRoute).snapshot.data;
  titre: string = this.data['titre'] ?? 'Section';
  description: string = this.data['description'] ?? '';
  icone: string = this.data['icone'] ?? 'pi-inbox';
}
