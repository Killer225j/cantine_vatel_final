import { StatutTransaction } from '@prisma/client';
import { LIBELLE_MOYEN } from './recharges.service';

interface Donnees {
  id: string;
  montant: number;
  moyen: keyof typeof LIBELLE_MOYEN | null;
  statut: StatutTransaction;
  reference: string | null;
  beneficiaire: string;
}

const echapper = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string,
  );

const fcfa = (n: number) => `${n.toLocaleString('fr-FR')} FCFA`;

const COULEUR_MOYEN: Record<string, string> = {
  WAVE: '#1dc8ff',
  ORANGE_MONEY: '#ff7900',
  MTN_MOMO: '#ffcc00',
  MOOV_MONEY: '#0a6ebd',
};

/**
 * Page de paiement simulée : aucun argent ne circule. Elle sert à démontrer le parcours complet
 * (recharge → paiement → solde crédité → reçu) sans connecter un vrai opérateur.
 */
export function pagePaiement(d: Donnees, chemin: string): string {
  const moyen = d.moyen ? LIBELLE_MOYEN[d.moyen] : 'Paiement mobile';
  const couleur = d.moyen ? COULEUR_MOYEN[d.moyen] : '#1b6fa8';

  let corps: string;
  if (d.statut === StatutTransaction.EN_ATTENTE) {
    corps = `
      <p class="montant">${fcfa(d.montant)}</p>
      <p class="sous">Recharge de la cantine de <strong>${echapper(d.beneficiaire)}</strong></p>
      <form method="post" action="${echapper(chemin)}">
        <button name="issue" value="succes" class="btn principal">Payer ${fcfa(d.montant)}</button>
        <button name="issue" value="echec" class="btn secondaire">Simuler un échec</button>
      </form>
      <p class="note">Paiement simulé : aucun argent n’est débité.</p>`;
  } else if (d.statut === StatutTransaction.REUSSIE) {
    corps = `
      <div class="pastille ok">✓</div>
      <p class="titre">Paiement réussi</p>
      <p class="montant">${fcfa(d.montant)}</p>
      <p class="sous">Le solde de <strong>${echapper(d.beneficiaire)}</strong> a été crédité.</p>
      <p class="recu">Reçu ${echapper(d.reference ?? '')}</p>
      <p class="note">Vous pouvez fermer cette page et revenir dans l’appli Cantine Vatel.</p>`;
  } else {
    corps = `
      <div class="pastille ko">✕</div>
      <p class="titre">Paiement échoué</p>
      <p class="sous">Aucun montant n’a été débité. Retournez dans l’appli pour réessayer.</p>`;
  }

  return `<!doctype html>
<html lang="fr"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Paiement ${echapper(moyen)} · Cantine Vatel</title>
<style>
  *{box-sizing:border-box}body{margin:0;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;background:#f2f8fd;color:#111827;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px}
  .carte{background:#fff;border-radius:20px;box-shadow:0 8px 30px rgba(18,80,125,.12);width:100%;max-width:400px;overflow:hidden;text-align:center}
  .bandeau{background:${couleur};color:#fff;padding:18px;font-weight:800;font-size:18px;letter-spacing:.3px}
  .contenu{padding:26px 24px 28px}
  .montant{font-size:34px;font-weight:800;color:#12507d;margin:6px 0}
  .titre{font-size:22px;font-weight:800;margin:8px 0}
  .sous{color:#6b7280;margin:6px 0 22px;line-height:1.5}
  .btn{display:block;width:100%;border:0;border-radius:14px;padding:15px;font-size:16px;font-weight:700;cursor:pointer;margin-top:10px}
  .principal{background:#1b6fa8;color:#fff}.secondaire{background:#fff;color:#b91c1c;border:1.5px solid #fecaca}
  .note{color:#9ca3af;font-size:12px;margin-top:18px}.recu{font-family:ui-monospace,monospace;font-weight:700;color:#12507d}
  .pastille{width:70px;height:70px;border-radius:50%;margin:0 auto 6px;display:flex;align-items:center;justify-content:center;font-size:34px;color:#fff}
  .ok{background:#059669}.ko{background:#b91c1c}
</style></head>
<body><main class="carte"><div class="bandeau">${echapper(moyen)}</div><div class="contenu">${corps}</div></main></body></html>`;
}
