// Décodage local (non vérifié) du payload d'un JWT — sert uniquement à lire
// `role`/`sub` côté client pour router l'UI. La confiance/validation reste
// entièrement côté serveur (le token est de toute façon vérifié à chaque
// requête par le backend) ; ne jamais fonder une décision de sécurité dessus.

export interface DecodedJwt {
  sub: string;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

const BASE64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

function base64ToUtf8(base64: string): string {
  // React Native/Hermes n'a pas toujours `atob` — décodage manuel portable.
  let str = base64.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4 !== 0) str += '=';

  let output = '';
  let buffer = 0;
  let bits = 0;
  for (const char of str) {
    if (char === '=') break;
    const value = BASE64_CHARS.indexOf(char);
    if (value === -1) continue;
    buffer = (buffer << 6) | value;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      output += String.fromCharCode((buffer >> bits) & 0xff);
    }
  }

  try {
    // Les payloads JWT sont de l'UTF-8 encodé en base64 — on repasse par
    // decodeURIComponent/escape pour gérer correctement les accents.
    return decodeURIComponent(
      output
        .split('')
        .map((c) => '%' + c.charCodeAt(0).toString(16).padStart(2, '0'))
        .join('')
    );
  } catch {
    return output;
  }
}

export function decodeJwt(token: string): DecodedJwt | null {
  try {
    const [, payload] = token.split('.');
    if (!payload) return null;
    return JSON.parse(base64ToUtf8(payload)) as DecodedJwt;
  } catch {
    return null;
  }
}
