import { Component, computed, input, signal } from '@angular/core';

/** Photo d'un plat ; si le fichier manque, des initiales sur fond pâle. */
@Component({
  selector: 'app-photo-plat',
  standalone: true,
  template: `
    @if (url() && !echec()) {
      <img
        [src]="url()"
        [alt]="nom()"
        (error)="echec.set(true)"
        class="object-cover rounded-lg shrink-0"
        [style.width.px]="taille()"
        [style.height.px]="taille()"
      />
    } @else {
      <span
        class="flex items-center justify-center rounded-lg shrink-0 font-bold bg-[#e7f3fc] text-vatel-primary-dark"
        [style.width.px]="taille()"
        [style.height.px]="taille()"
        [style.font-size.px]="taille() / 2.8"
        >{{ initiales() }}</span
      >
    }
  `,
})
export class PhotoPlatComponent {
  url = input<string | null | undefined>(null);
  nom = input.required<string>();
  taille = input(40);
  echec = signal(false);
  initiales = computed(() =>
    this.nom()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((m) => m[0].toUpperCase())
      .join(''),
  );
}
