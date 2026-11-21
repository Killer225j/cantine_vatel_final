/**
 * Événements métier, émis par `EventEmitter2` (module global).
 *
 * Un service émet un fait accompli ; les écouteurs (notifications, écran cuisine…) réagissent
 * sans que l'émetteur les connaisse. Les noms et charges utiles de la cantine s'ajoutent ici.
 *
 * Exemple :
 *   export const RESERVATION_CREEE = 'reservation.creee';
 *   export interface ReservationCreeePayload { reservationId: string; userId: string }
 */
export {};
