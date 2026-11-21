import { Component, input, output } from '@angular/core';

/**
 * Modal de confirmation d'une action (valider, annuler, supprimer…). Le parent porte l'appel API,
 * l'état de traitement et l'erreur — le modal ne ferme jamais de lui-même. Un champ de saisie
 * éventuel se projette dans le corps (`<ng-content>`).
 */
@Component({
  selector: 'app-confirmation-dialog',
  standalone: true,
  templateUrl: './confirmation-dialog.component.html',
  styleUrl: './confirmation-dialog.component.scss',
})
export class ConfirmationDialogComponent {
  visible       = input<boolean>(false);
  titre         = input<string>('');
  sousTitre     = input<string>('');
  message       = input<string>('');
  libelleBouton = input<string>('Confirmer');
  /** `danger` : suppression / annulation (rouge) ; `success` : validation (vert). */
  tone          = input<'danger' | 'success'>('danger');
  icone         = input<string>('pi-question-circle');
  isLoading     = input<boolean>(false);
  error         = input<string>('');
  /** Désactive la confirmation (ex. champ projeté invalide). */
  confirmDisabled = input<boolean>(false);
  /** Niveau d'empilement : à relever quand le dialogue s'ouvre par-dessus un autre modal. */
  niveau = input<number>(2000);

  confirmed = output<void>();
  cancelled = output<void>();
}
