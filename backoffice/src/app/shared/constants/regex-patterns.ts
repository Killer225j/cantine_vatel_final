/** Même tolérance que Validators.email d'Angular (local@domaine, sans espace) — suffisant côté écran, le backend revalide. */
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+$/;
