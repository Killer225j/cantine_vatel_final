/**
 * Codes d'erreur métier, stables et indépendants de la langue.
 *
 * `error.message` est rédigé pour être lu tel quel ; le client peut aussi s'appuyer sur
 * `error.reason` pour choisir son propre message. Un code publié n'est jamais renommé.
 */
export const ERROR_REASON = {
  /** Violation d'unicité en base non couverte par un cas métier explicite. */
  UNIQUE_CONSTRAINT: 'UNIQUE_CONSTRAINT',
  /** La ressource visée par une écriture n'existe pas ou plus. */
  RECORD_NOT_FOUND: 'RECORD_NOT_FOUND',
  /** La requête désigne une ressource inexistante, ou en supprime une dont d'autres dépendent. */
  INVALID_REFERENCE: 'INVALID_REFERENCE',
  /** Identifiant (email ou téléphone) ou mot de passe faux, sans dire lequel. */
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  /** Le compte existe mais a été désactivé. */
  ACCOUNT_DEACTIVATED: 'ACCOUNT_DEACTIVATED',
  /** Le refresh token est refusé : il faut se reconnecter. */
  SESSION_EXPIRED: 'SESSION_EXPIRED',
  /** Trop d'essais sur une route publique limitée en débit. */
  RATE_LIMITED: 'RATE_LIMITED',
  // ─── Cantine ────────────────────────────────────────────────────────────
  /** Le menu du jour n'est pas (encore) publié : aucune réservation possible. */
  MENU_NON_PUBLIE: 'MENU_NON_PUBLIE',
  /** La date du repas est passée. */
  DATE_PASSEE: 'DATE_PASSEE',
  /** Le créneau a atteint sa capacité. */
  CRENEAU_COMPLET: 'CRENEAU_COMPLET',
  /** L'élève a déjà une réservation active ce jour-là. */
  DEJA_RESERVE: 'DEJA_RESERVE',
  /** Le solde du portefeuille ne couvre pas le prix. */
  SOLDE_INSUFFISANT: 'SOLDE_INSUFFISANT',
  /** Annulation demandée après l'heure limite (10h le jour du repas). */
  ANNULATION_TROP_TARD: 'ANNULATION_TROP_TARD',
  /** Aucune réservation ne porte ce code. */
  CODE_INCONNU: 'CODE_INCONNU',
  /** La réservation n'est pas pour aujourd'hui. */
  PAS_AUJOURDHUI: 'PAS_AUJOURDHUI',
  /** La réservation a déjà été servie : ne pas servir deux fois. */
  DEJA_SERVIE: 'DEJA_SERVIE',
  /** La réservation a été annulée. */
  RESERVATION_ANNULEE: 'RESERVATION_ANNULEE',
  /** Le plat contient un allergène de l'élève : le contrôle doit être confirmé avant de servir. */
  CONTROLE_ALLERGIE_REQUIS: 'CONTROLE_ALLERGIE_REQUIS',
  /** Aucun élève ne porte ce code de liaison. */
  CODE_LIAISON_INCONNU: 'CODE_LIAISON_INCONNU',
  /** Cet enfant est déjà lié à ce compte parent. */
  DEJA_LIE: 'DEJA_LIE',
  /** Cet élève n'est pas lié à ce compte parent. */
  ENFANT_NON_LIE: 'ENFANT_NON_LIE',
  /** La recharge n'est plus en attente (déjà payée ou échouée). */
  RECHARGE_TERMINEE: 'RECHARGE_TERMINEE',
  /** On ne note que ce qu'on a mangé : la réservation n'a pas été servie. */
  PAS_SERVIE: 'PAS_SERVIE',
  /** Ce repas a déjà reçu un avis. */
  DEJA_NOTE: 'DEJA_NOTE',
  /** La sortie demandée dépasse la quantité en stock. */
  STOCK_INSUFFISANT: 'STOCK_INSUFFISANT',
  /** Conflit d'écriture concurrente : réessayer. */
  CONFLIT_CONCURRENT: 'CONFLIT_CONCURRENT',
  /** Erreur inattendue : le détail n'est pas exposé au client. */
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;

export type ErrorReason = (typeof ERROR_REASON)[keyof typeof ERROR_REASON];
