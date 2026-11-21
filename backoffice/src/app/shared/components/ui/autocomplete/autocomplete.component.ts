import { Component, DestroyRef, ElementRef, computed, inject, input, model, output, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { Observable, Subject, of } from 'rxjs';
import { catchError, debounceTime, switchMap } from 'rxjs/operators';
import { calculerPlacementListe, PlacementListe } from './autocomplete.utils';

/**
 * Champ de saisie libre avec liste de suggestions — mécanique unique pour toutes les
 * autocomplétions de l'application (plat, élève, produit…) :
 * debounce → `search(q)` (locale ou HTTP) → liste → sélection au mousedown (avant le blur,
 * fermé après 150 ms) → `selected`. Le texte affiché est `[(value)]`, le parent garde la
 * valeur métier (id) et l'invalide sur `typed`.
 *
 *   search       — (q) => Observable<T[]> : filtre local (`of(...)`) ou appel serveur
 *   optionLabel  — libellé principal d'une option ; optionHint — texte secondaire (code…)
 *   minLength    — 0 pour afficher la liste dès le focus (listes locales), 2 pour du serveur
 *   kind         — 'text' | 'textarea' (désignations longues) | 'digits' (code SH)
 *   clearable    — bouton × quand `hasSelection` (le parent remet sa valeur métier à zéro sur `cleared`)
 */
@Component({
  selector: 'app-autocomplete',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './autocomplete.component.html',
  styleUrl: './autocomplete.component.scss',
})
export class AutocompleteComponent<T> {
  private destroyRef = inject(DestroyRef);

  search       = input.required<(q: string) => Observable<T[]>>();
  optionLabel  = input.required<(item: T) => string>();
  optionHint   = input<(item: T) => string | null | undefined>();
  trackBy      = input<(item: T) => string>();
  minLength    = input(1);
  debounce     = input(250);
  kind         = input<'text' | 'textarea' | 'digits'>('text');
  maxLength    = input<number | null>(null);
  placeholder  = input('');
  emptyMessage = input('Aucun résultat');
  clearable    = input(false);
  hasSelection = input(false);

  value = model<string>('');

  selected = output<T>();
  /** Le texte a été modifié à la main : la sélection précédente ne vaut plus. */
  typed    = output<void>();
  blurred  = output<void>();
  cleared  = output<void>();

  suggestions  = signal<T[]>([]);
  dropdownOpen = signal(false);
  loading      = signal(false);
  /** true après une recherche effectivement lancée (pour afficher « aucun résultat »). */
  searched     = signal(false);

  private query$ = new Subject<string>();
  private champ = viewChild.required<ElementRef<HTMLElement>>('champ');

  /** Liste en position: fixed — un modal qui défile (overflow) ne peut pas la rogner. */
  private placement = signal<PlacementListe & { left: string; width: string; top: string; bottom: string }>({
    versLeHaut: false, maxHeight: 0, left: '0', width: 'auto', top: 'auto', bottom: 'auto',
  });
  versLeHaut = computed(() => this.placement().versLeHaut);
  placementListe = computed(() => {
    const { left, width, top, bottom, maxHeight } = this.placement();
    return { left, width, top, bottom, 'max-height': `${maxHeight}px` };
  });

  constructor() {
    const repositionner = () => { if (this.dropdownOpen()) this.positionnerListe(); };
    window.addEventListener('scroll', repositionner, true);
    window.addEventListener('resize', repositionner);
    this.destroyRef.onDestroy(() => {
      window.removeEventListener('scroll', repositionner, true);
      window.removeEventListener('resize', repositionner);
    });

    this.query$.pipe(
      debounceTime(this.debounce()),
      switchMap(q => {
        if (q.length < this.minLength()) { this.searched.set(false); return of([] as T[]); }
        this.loading.set(true);
        this.searched.set(true);
        return this.search()(q).pipe(catchError(() => of([] as T[])));
      }),
      takeUntilDestroyed(this.destroyRef),
    ).subscribe(items => {
      this.suggestions.set(items);
      this.loading.set(false);
    });
  }

  private positionnerListe(): void {
    const r = this.champ().nativeElement.getBoundingClientRect();
    const { versLeHaut, maxHeight } = calculerPlacementListe(r, window.innerHeight);
    this.placement.set({
      versLeHaut,
      maxHeight,
      left: `${r.left}px`,
      width: `${r.width}px`,
      top: versLeHaut ? 'auto' : `${r.bottom}px`,
      bottom: versLeHaut ? `${window.innerHeight - r.top}px` : 'auto',
    });
  }

  onFocus(): void {
    this.positionnerListe();
    this.dropdownOpen.set(true);
    if (this.minLength() === 0) this.query$.next(this.value().trim());
  }

  onInput(raw: string): void {
    let v = raw;
    if (this.kind() === 'digits') v = v.replace(/\D/g, '');
    const max = this.maxLength();
    if (max) v = v.slice(0, max);
    this.value.set(v);
    this.typed.emit();
    this.positionnerListe();
    this.dropdownOpen.set(true);
    this.query$.next(v.trim());
  }

  onBlur(): void {
    // Délai pour laisser le mousedown de select() s'exécuter avant la fermeture — mais le
    // composant peut être détruit entre-temps (modal fermé, @if basculé) : sans ce guard,
    // le timeout tente d'émettre sur un output() déjà détruit → NG0953.
    const timeoutId = setTimeout(() => {
      this.dropdownOpen.set(false);
      this.blurred.emit();
    }, 150);
    this.destroyRef.onDestroy(() => clearTimeout(timeoutId));
  }

  select(item: T): void {
    this.value.set(this.optionLabel()(item));
    this.dropdownOpen.set(false);
    this.suggestions.set([]);
    this.selected.emit(item);
  }

  clear(): void {
    this.value.set('');
    this.suggestions.set([]);
    this.dropdownOpen.set(false);
    this.cleared.emit();
  }

  key(item: T): string {
    const fn = this.trackBy();
    return fn ? fn(item) : this.optionLabel()(item);
  }

  showEmpty(): boolean {
    return this.dropdownOpen() && this.searched() && !this.loading() && this.suggestions().length === 0 && this.value().trim().length >= this.minLength();
  }
}
