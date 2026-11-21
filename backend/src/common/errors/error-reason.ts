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
  /** Erreur inattendue : le détail n'est pas exposé au client. */
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;

export type ErrorReason = (typeof ERROR_REASON)[keyof typeof ERROR_REASON];
