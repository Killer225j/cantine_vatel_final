/** Une erreur HTTP porteuse d'une `reason` stable (cf. ERROR_REASON), lue par les clients. */
export function erreurMetier<T extends new (body: object) => Error>(
  Type: T,
  reason: string,
  message: string,
  extra = {},
) {
  return new Type({ message, reason, ...extra });
}
