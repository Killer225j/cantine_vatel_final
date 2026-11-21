import { randomInt } from 'crypto';
import { PrismaClient } from '@prisma/client';

/** Code qu'un élève donne à son parent pour être suivi : trois lettres du nom et quatre chiffres (KOF-4821). */
export function genererCodeLiaison(nomFamille: string): string {
  const base = (nomFamille ?? '')
    .normalize('NFD')
    .replace(/[^A-Za-z]/g, '')
    .toUpperCase()
    .slice(0, 3)
    .padEnd(3, 'X');
  return `${base}-${randomInt(1000, 10000)}`;
}

/**
 * Un élève a toujours un portefeuille et un code de liaison. Les comptes créés avant cette règle
 * (ou par un autre chemin) sont complétés ici, à la première lecture.
 */
export async function assurerCompteEleve(prisma: PrismaClient, userId: string): Promise<void> {
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: { lastName: true, codeLiaison: true, portefeuille: { select: { userId: true } } },
  });
  if (!u) return;
  if (!u.portefeuille) {
    await prisma.portefeuille.upsert({
      where: { userId },
      update: {},
      create: { userId, solde: 0, seuilAlerte: 2000 },
    });
  }
  if (!u.codeLiaison) {
    for (let i = 0; i < 10; i++) {
      try {
        await prisma.user.update({
          where: { id: userId },
          data: { codeLiaison: genererCodeLiaison(u.lastName ?? '') },
        });
        return;
      } catch {
        /* code déjà pris : on en tire un autre */
      }
    }
  }
}
