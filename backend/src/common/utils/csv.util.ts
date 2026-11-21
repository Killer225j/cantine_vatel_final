/** Un nombre seul — `-15`, `3.5` — est une valeur, pas une formule : Excel ne l'exécute pas. */
const NOMBRE = /^-?\d+([.,]\d+)?$/;

/**
 * Neutralise l'injection de formule : une cellule commençant par = + - @ s'exécute dans Excel. Un nombre négatif
 * fait exception, sans quoi un écart de `-15` s'écrirait `'-15` et ne serait plus un nombre.
 */
export function csvCell(valeur: string): string {
  const sur = !NOMBRE.test(valeur) && /^[=+\-@]/.test(valeur) ? `'${valeur}` : valeur;
  return /[;"\r\n]/.test(sur) ? `"${sur.replace(/"/g, '""')}"` : sur;
}

/**
 * Un CSV que le comptable ouvre dans Excel : séparateur `;`, fins de ligne Windows, et un BOM
 * — sans lui, Excel lit l'UTF-8 en Windows-1252 et abîme les accents.
 */
export function toCsv(entete: string[], lignes: string[][]): string {
  const ecrire = (cellules: string[]) => cellules.map(csvCell).join(';');
  return '﻿' + [ecrire(entete), ...lignes.map(ecrire)].join('\r\n') + '\r\n';
}
