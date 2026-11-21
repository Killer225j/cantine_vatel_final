import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ERROR_REASON } from '../../common/errors/error-reason';
import { erreurMetier } from '../../common/errors/erreur-metier';
import { PrismaService } from '../../shared/prisma/prisma.service';

export type StatutStock = 'OK' | 'BAS' | 'RUPTURE';

const num = (d: { toNumber(): number }) => d.toNumber();

function statut(quantite: number, seuil: number): StatutStock {
  if (quantite <= 0) return 'RUPTURE';
  return quantite < seuil ? 'BAS' : 'OK';
}

@Injectable()
export class StocksService {
  constructor(private readonly prisma: PrismaService) {}

  /** Articles suivis, compteurs et derniers mouvements. */
  async lister(maintenant = new Date()) {
    const il_y_a_7_jours = new Date(maintenant.getTime() - 7 * 86_400_000);
    const [articles, recents, semaine] = await Promise.all([
      this.prisma.articleStock.findMany({ orderBy: { nom: 'asc' } }),
      this.prisma.mouvementStock.findMany({
        orderBy: { creeLe: 'desc' },
        take: 10,
        include: { article: { select: { nom: true, unite: true } } },
      }),
      this.prisma.mouvementStock.count({ where: { creeLe: { gte: il_y_a_7_jours } } }),
    ]);
    const vues = articles.map((a) => {
      const quantite = num(a.quantite);
      const seuilAlerte = num(a.seuilAlerte);
      return {
        id: a.id,
        nom: a.nom,
        unite: a.unite,
        quantite,
        seuilAlerte,
        statut: statut(quantite, seuilAlerte),
        // Niveau par rapport au double du seuil : 100 % = confortable.
        niveau:
          seuilAlerte > 0 ? Math.min(100, Math.round((quantite / (seuilAlerte * 2)) * 100)) : 100,
      };
    });
    return {
      compteurs: {
        suivis: vues.length,
        sousSeuil: vues.filter((v) => v.statut === 'BAS').length,
        rupture: vues.filter((v) => v.statut === 'RUPTURE').length,
        mouvementsSemaine: semaine,
      },
      articles: vues,
      mouvements: recents.map((m) => ({
        id: m.id,
        article: m.article.nom,
        unite: m.article.unite,
        delta: num(m.delta),
        motif: m.motif,
        creeLe: m.creeLe,
      })),
    };
  }

  /** Entrée (livraison) ou sortie (cuisine, perte) : la quantité ne peut jamais devenir négative. */
  async mouvement(
    id: string,
    dto: { type: 'ENTREE' | 'SORTIE'; quantite: number; motif: string; note?: string },
  ) {
    const delta = dto.type === 'ENTREE' ? dto.quantite : -dto.quantite;
    const motif = [dto.motif.trim(), dto.note?.trim()].filter(Boolean).join(' — ');
    return this.prisma.$transaction(async (tx) => {
      const article = await tx.articleStock.findUnique({ where: { id } });
      if (!article) throw new NotFoundException('Article introuvable.');
      const apres = num(article.quantite) + delta;
      if (apres < 0) {
        throw erreurMetier(
          BadRequestException,
          ERROR_REASON.STOCK_INSUFFISANT,
          `Stock insuffisant : il reste ${num(article.quantite)} ${article.unite} de ${article.nom}.`,
        );
      }
      const maj = await tx.articleStock.update({
        where: { id },
        data: { quantite: apres },
      });
      await tx.mouvementStock.create({ data: { articleId: id, delta, motif } });
      const quantite = num(maj.quantite);
      return {
        id: maj.id,
        nom: maj.nom,
        unite: maj.unite,
        quantite,
        seuilAlerte: num(maj.seuilAlerte),
        statut: statut(quantite, num(maj.seuilAlerte)),
      };
    });
  }
}
