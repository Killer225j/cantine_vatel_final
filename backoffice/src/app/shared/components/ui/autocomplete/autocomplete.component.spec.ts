import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { Observable, of } from 'rxjs';
import { AutocompleteComponent } from './autocomplete.component';

@Component({
  standalone: true,
  imports: [AutocompleteComponent],
  template: `
    <div id="zone" style="position: fixed; top: 20px; left: 20px; width: 300px; height: 120px; overflow-y: auto; background: #fff;">
      <div style="height: 60px;"></div>
      <app-autocomplete [search]="chercher" [optionLabel]="libelle" [minLength]="0" [(value)]="texte" />
    </div>`,
})
class HoteComponent {
  texte = signal('');
  chercher = (): Observable<string[]> => of(['ACONAGE TC', 'CONTAINER SERVICE CHARGE', 'DIVERS HS', 'FRAIS DE PORT', 'MANUTENTION']);
  libelle = (s: string) => s;
}

describe('AutocompleteComponent — liste dans une zone qui défile', () => {
  let fixture: ComponentFixture<HoteComponent>;

  beforeEach(() => {
    fixture = TestBed.configureTestingModule({ imports: [HoteComponent] }).createComponent(HoteComponent);
    fixture.detectChanges();
  });

  it('affiche la liste par-dessus le bas de la zone au lieu de la rogner', fakeAsync(() => {
    const racine: HTMLElement = fixture.nativeElement;
    racine.querySelector('input')!.dispatchEvent(new Event('focus'));
    tick(300);
    fixture.detectChanges();

    const zone = racine.querySelector('#zone')!.getBoundingClientRect();
    const liste = racine.querySelector('.ac-dropdown') as HTMLElement;
    const rect = liste.getBoundingClientRect();

    expect(getComputedStyle(liste).position).toBe('fixed');
    expect(rect.bottom).toBeGreaterThan(zone.bottom);

    const pointHorsZone = document.elementFromPoint(rect.left + 20, zone.bottom + 20);
    expect(pointHorsZone?.closest('.ac-dropdown')).toBe(liste);
  }));
});
