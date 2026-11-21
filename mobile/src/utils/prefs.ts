import AsyncStorage from '@react-native-async-storage/async-storage';
import { Moyen } from '../api/cantine.api';

/** Préférences de l'appareil (pas des secrets) : moyen de paiement par défaut et alertes souhaitées. */
export interface Prefs {
  moyen: Moyen;
  alerteSoldeBas: boolean;
  recapQuotidien: boolean;
  alerteAllergie: boolean;
}

const CLE = 'cantine_prefs';
export const PREFS_PAR_DEFAUT: Prefs = {
  moyen: 'WAVE',
  alerteSoldeBas: true,
  recapQuotidien: true,
  alerteAllergie: true,
};

export async function lirePrefs(): Promise<Prefs> {
  try {
    const brut = await AsyncStorage.getItem(CLE);
    return brut ? { ...PREFS_PAR_DEFAUT, ...JSON.parse(brut) } : PREFS_PAR_DEFAUT;
  } catch {
    return PREFS_PAR_DEFAUT;
  }
}

export async function ecrirePrefs(prefs: Prefs): Promise<void> {
  try {
    await AsyncStorage.setItem(CLE, JSON.stringify(prefs));
  } catch {
    /* la préférence n'est pas critique : on garde la valeur affichée */
  }
}
