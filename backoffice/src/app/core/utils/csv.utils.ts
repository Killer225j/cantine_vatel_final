/** Télécharge un tableau de lignes en CSV (séparateur « ; », UTF-8 avec BOM pour Excel). */
export function telechargerCsv(
  nomFichier: string,
  entetes: string[],
  lignes: (string | number | null)[][],
): void {
  const echapper = (v: string | number | null) => {
    const texte = v === null ? '' : String(v);
    return /[";\n]/.test(texte) ? `"${texte.replace(/"/g, '""')}"` : texte;
  };
  const contenu = [entetes, ...lignes].map((l) => l.map(echapper).join(';')).join('\n');
  const blob = new Blob(['﻿' + contenu], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nomFichier;
  a.click();
  URL.revokeObjectURL(url);
}
