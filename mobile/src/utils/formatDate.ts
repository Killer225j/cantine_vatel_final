export const formatDate = (date: string): string => {
  const d = new Date(date);
  return d.toLocaleDateString('fr-FR', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

// "dimanche 09 août" — utilisé pour les en-têtes de section par jour
// (mis en majuscules via le style, pas ici).
export const formatDateHeader = (date: string): string => {
  const d = new Date(date);
  return d.toLocaleDateString('fr-FR', { weekday: 'long', day: '2-digit', month: 'long' });
};

export const formatDateShort = (date: string): string => {
  const d = new Date(date);
  return d.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

export const formatTime = (time: string): string => {
  return time.slice(0, 5);
};

export const formatTimeRange = (start: string, end: string): string => {
  return `${formatTime(start)} - ${formatTime(end)}`;
};

export const formatDateTime = (date: string): string => {
  const d = new Date(date);
  return d.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const isToday = (date: string): boolean => {
  const d = new Date(date);
  const today = new Date();
  return (
    d.getDate() === today.getDate() &&
    d.getMonth() === today.getMonth() &&
    d.getFullYear() === today.getFullYear()
  );
};

export const isFuture = (date: string): boolean => {
  return new Date(date) > new Date();
};

// Masque de saisie pour un champ "Date de naissance" en clavier numérique
// (pas de touche `/`) : insère les séparateurs au fil de la frappe.
export const maskBirthDateInput = (value: string): string => {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  const parts = [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4, 8)].filter(Boolean);
  return parts.join('/');
};

// "JJ/MM/AAAA" → "AAAA-MM-JJ" (format attendu par le backend). `new
// Date("15/05/1990")` n'est pas fiable selon les moteurs JS — parsing explicite.
export const parseFrenchDateToIso = (value: string): string | undefined => {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value.trim());
  if (!match) return undefined;
  const [, day, month, year] = match;
  const iso = `${year}-${month}-${day}`;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return undefined;
  return iso;
};

// "AAAA-MM-JJ" → "JJ/MM/AAAA" — pré-remplissage d'un champ éditable à partir
// d'une valeur stockée au format ISO (symétrique de parseFrenchDateToIso).
export const formatIsoToFrench = (value?: string): string => {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec((value ?? '').trim());
  if (!match) return '';
  const [, year, month, day] = match;
  return `${day}/${month}/${year}`;
};