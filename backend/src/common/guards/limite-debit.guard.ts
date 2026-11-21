import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { Request } from 'express';
import { ERROR_REASON } from '../errors/error-reason';

/** Requêtes admises par adresse et par fenêtre. Assez large pour un usage normal, bloquant pour un essai en masse. */
// Derrière le proxy de Render, plusieurs clients peuvent partager une même adresse vue par
// l’API : la limite reste large pour ne jamais bloquer une démo.
const LIMITE = 100;
const FENETRE_MS = 10 * 60 * 1000;

/**
 * Limite le débit d'une route publique, par adresse IP, en mémoire.
 *
 * Une route publique (connexion, inscription) est ouverte à tous :
 * sans limite, rien n’empêcherait d’essayer des millions de mots de passe. Cent essais par dix minutes
 * suffisent à un usage normal et rendent l'essai en masse inutile.
 *
 * En mémoire, donc propre à chaque instance de l'API : c'est suffisant pour une instance
 * par environnement. À plusieurs instances, il faudrait un compteur partagé.
 */
@Injectable()
export class LimiteDebitGuard implements CanActivate {
  private readonly compteurs = new Map<string, { debut: number; nombre: number }>();

  canActivate(context: ExecutionContext): boolean {
    const maintenant = Date.now();
    const cle = adresseClient(context.switchToHttp().getRequest<Request>());

    this.oublierLesFenetresEchues(maintenant);

    const compteur = this.compteurs.get(cle);
    if (!compteur || maintenant - compteur.debut >= FENETRE_MS) {
      this.compteurs.set(cle, { debut: maintenant, nombre: 1 });
      return true;
    }

    compteur.nombre += 1;
    if (compteur.nombre > LIMITE) {
      throw new HttpException(
        {
          message: 'Trop de tentatives. Réessayez dans quelques minutes.',
          reason: ERROR_REASON.RATE_LIMITED,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    return true;
  }

  /** La table ne doit pas grossir indéfiniment : on purge ce qui ne compte plus. */
  private oublierLesFenetresEchues(maintenant: number): void {
    if (this.compteurs.size < 10_000) return;
    for (const [cle, { debut }] of this.compteurs) {
      if (maintenant - debut >= FENETRE_MS) this.compteurs.delete(cle);
    }
  }
}

/**
 * L'adresse du client. Derrière un proxy, `req.ip` est celle du proxy : c’est la **dernière**
 * entrée de `X-Forwarded-For` qu'il faut lire, celle que le proxy ajoute lui-même. Les
 * précédentes viennent du client et se falsifient à volonté.
 */
export function adresseClient(req: Request): string {
  const transmis = req.headers['x-forwarded-for'];
  const chaine = Array.isArray(transmis) ? transmis.join(',') : transmis;
  const derniere = chaine
    ?.split(',')
    .map((a) => a.trim())
    .filter((a) => a.length > 0)
    .pop();
  return derniere ?? req.ip ?? 'inconnue';
}
