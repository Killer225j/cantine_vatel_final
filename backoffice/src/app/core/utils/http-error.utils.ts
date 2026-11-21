/**
 * Message d'erreur affichable à partir d'une HttpErrorResponse de l'API Cantine Vatel.
 * L'API enveloppe ses erreurs dans { success: false, error: { code, message, details? } } ;
 * `details` liste les messages de validation d'une 400.
 */
export function apiErrorMessage(err: unknown, fallback: string): string {
  const corps = (err as { error?: { error?: { message?: unknown; details?: unknown } } } | null)
    ?.error?.error;
  const details = corps?.details;
  if (Array.isArray(details)) {
    const lignes = details.filter((m): m is string => typeof m === 'string');
    if (lignes.length) return lignes.join(' · ');
  }
  const message = corps?.message;
  if (typeof message === 'string' && message.trim()) return message;
  return fallback;
}
