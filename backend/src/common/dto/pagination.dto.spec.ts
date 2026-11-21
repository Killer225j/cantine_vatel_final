import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { PAGINATED_RESULT, PaginationDto, isPaginatedResult, paginate } from './pagination.dto';
import { SearchableDto } from './searchable.dto';

describe('paginate', () => {
  it('calcule le nombre de pages en arrondissant au supérieur', () => {
    expect(paginate([], 42, 1, 20).meta).toEqual({ total: 42, page: 1, limit: 20, totalPages: 3 });
  });

  it('annonce zéro page quand rien ne correspond', () => {
    expect(paginate([], 0, 1, 20).meta.totalPages).toBe(0);
  });

  it('porte un marqueur en symbole, invisible en JSON', () => {
    const resultat = paginate([{ id: 'a' }], 1, 1, 20);

    expect(resultat[PAGINATED_RESULT]).toBe(true);
    expect(JSON.parse(JSON.stringify(resultat))).toEqual({
      items: [{ id: 'a' }],
      meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
    });
  });
});

describe('isPaginatedResult', () => {
  it('reconnaît un résultat paginé', () => {
    expect(isPaginatedResult(paginate([], 0, 1, 20))).toBe(true);
  });

  it('rejette tout ce qui n’en porte pas le marqueur', () => {
    expect(isPaginatedResult(null)).toBe(false);
    expect(isPaginatedResult(undefined)).toBe(false);
    expect(isPaginatedResult('items')).toBe(false);
    expect(isPaginatedResult({ items: [], meta: {} })).toBe(false);
  });
});

describe('PaginationDto', () => {
  const transformer = (donnees: Record<string, unknown>) =>
    plainToInstance(PaginationDto, donnees, { enableImplicitConversion: true });

  it('retient 1 et 20 par défaut', () => {
    const dto = transformer({});

    expect(dto.page).toBe(1);
    expect(dto.limit).toBe(20);
  });

  it('convertit les valeurs reçues en chaîne — la query string ne porte que du texte', () => {
    const dto = transformer({ page: '3', limit: '50' });

    expect(dto.page).toBe(3);
    expect(dto.limit).toBe(50);
    expect(validateSync(dto)).toHaveLength(0);
  });

  it('refuse une page nulle ou négative', () => {
    expect(validateSync(transformer({ page: 0 }))).not.toHaveLength(0);
  });

  it('plafonne la taille de page à 100', () => {
    expect(validateSync(transformer({ limit: 101 }))).not.toHaveLength(0);
  });

  it('refuse une taille de page non entière', () => {
    expect(validateSync(transformer({ limit: 2.5 }))).not.toHaveLength(0);
  });
});

describe('SearchableDto', () => {
  it('accepte l’absence de terme de recherche', () => {
    expect(validateSync(plainToInstance(SearchableDto, {}))).toHaveLength(0);
  });

  it('refuse un terme vide', () => {
    expect(validateSync(plainToInstance(SearchableDto, { q: '' }))).not.toHaveLength(0);
  });

  it('hérite de la pagination', () => {
    const dto = plainToInstance(SearchableDto, { q: 'yao' });

    expect(dto.q).toBe('yao');
    expect(dto.page).toBe(1);
    expect(dto.limit).toBe(20);
  });
});
