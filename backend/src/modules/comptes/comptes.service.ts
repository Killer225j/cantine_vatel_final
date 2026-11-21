import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { randomInt } from 'node:crypto';
import { ERROR_REASON } from '../../common/errors/error-reason';
import { erreurMetier } from '../../common/errors/erreur-metier';
import { PrismaService } from '../../shared/prisma/prisma.service';

const nom = (u: { firstName: string | null; lastName: string | null }) =>
  `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim();

const ALPHABET_MDP = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789';

@Injectable()
export class ComptesService {
  constructor(private readonly prisma: PrismaService) {}

  /** Tous les comptes, rangés par onglet (élèves, parents, personnel), avec les compteurs. */
  async lister() {
    const users = await this.prisma.user.findMany({
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      select: {
        id: true,
        email: true,
        phone: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        classe: true,
        codeLiaison: true,
        allergenes: { select: { code: true, nom: true } },
        portefeuille: { select: { solde: true, seuilAlerte: true } },
        enfants: { select: { enfant: { select: { id: true, firstName: true, lastName: true } } } },
        parents: { select: { parent: { select: { id: true, firstName: true, lastName: true } } } },
      },
    });

    const eleves = users
      .filter((u) => u.role === Role.ELEVE)
      .map((u) => {
        const solde = u.portefeuille?.solde ?? 0;
        const seuilAlerte = u.portefeuille?.seuilAlerte ?? 2000;
        return {
          id: u.id,
          nom: nom(u),
          email: u.email,
          classe: u.classe,
          allergenes: u.allergenes,
          solde,
          seuilAlerte,
          soldeBas: solde < seuilAlerte,
          codeLiaison: u.codeLiaison,
          parents: u.parents.map((l) => ({ id: l.parent.id, nom: nom(l.parent) })),
          actif: u.isActive,
        };
      });
    const parents = users
      .filter((u) => u.role === Role.PARENT)
      .map((u) => ({
        id: u.id,
        nom: nom(u),
        email: u.email,
        telephone: u.phone,
        enfants: u.enfants.map((l) => ({ id: l.enfant.id, nom: nom(l.enfant) })),
        actif: u.isActive,
      }));
    const personnel = users
      .filter((u) => u.role === Role.ADMIN || u.role === Role.CUISINE)
      .map((u) => ({ id: u.id, nom: nom(u), email: u.email, role: u.role, actif: u.isActive }));

    return {
      compteurs: {
        eleves: eleves.length,
        parentsLies: parents.filter((p) => p.enfants.length > 0).length,
        elevesAvecAllergie: eleves.filter((e) => e.allergenes.length > 0).length,
        soldesBas: eleves.filter((e) => e.soldeBas).length,
      },
      eleves,
      parents,
      personnel,
    };
  }

  /** Lie un parent à un élève (par l'administration, sans passer par le code de liaison). */
  async lier(parentId: string, enfantId: string) {
    const [parent, enfant] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: parentId }, select: { role: true } }),
      this.prisma.user.findUnique({ where: { id: enfantId }, select: { role: true } }),
    ]);
    if (parent?.role !== Role.PARENT) throw new NotFoundException('Parent introuvable.');
    if (enfant?.role !== Role.ELEVE) throw new NotFoundException('Élève introuvable.');
    const deja = await this.prisma.lienParent.findUnique({
      where: { parentId_enfantId: { parentId, enfantId } },
    });
    if (deja) {
      throw erreurMetier(
        ConflictException,
        ERROR_REASON.DEJA_LIE,
        'Ce parent est déjà lié à cet élève.',
      );
    }
    await this.prisma.lienParent.create({ data: { parentId, enfantId } });
    return { parentId, enfantId };
  }

  /** Active ou désactive un compte (jamais le sien). */
  async definirActif(moi: string, id: string, actif: boolean) {
    if (moi === id) {
      throw new ForbiddenException('Vous ne pouvez pas désactiver votre propre compte.');
    }
    const u = await this.prisma.user.update({
      where: { id },
      data: { isActive: actif },
      select: { id: true, isActive: true },
    });
    return { id: u.id, actif: u.isActive };
  }

  /** Crée un compte avec un mot de passe temporaire, montré une seule fois. */
  async inviter(dto: { prenom: string; nom: string; email: string; role: Role; classe?: string }) {
    const email = dto.email.trim().toLowerCase();
    if (await this.prisma.user.findUnique({ where: { email } })) {
      throw new ConflictException('Un compte existe déjà avec cet email.');
    }
    if (dto.role === Role.ELEVE && !dto.classe?.trim()) {
      throw new BadRequestException('La classe de l’élève est obligatoire.');
    }
    const motDePasse = Array.from(
      { length: 10 },
      () => ALPHABET_MDP[randomInt(ALPHABET_MDP.length)],
    ).join('');
    const code = dto.role === Role.ELEVE ? await this.genererCodeLiaison(dto.nom) : null;
    const user = await this.prisma.user.create({
      data: {
        email,
        firstName: dto.prenom.trim(),
        lastName: dto.nom.trim(),
        role: dto.role,
        classe: dto.role === Role.ELEVE ? dto.classe?.trim() : null,
        codeLiaison: code,
        passwordHash: await bcrypt.hash(motDePasse, 10),
        ...(dto.role === Role.ELEVE
          ? { portefeuille: { create: { solde: 0, seuilAlerte: 2000 } } }
          : {}),
      },
      select: { id: true, email: true, role: true },
    });
    return { ...user, motDePasseTemporaire: motDePasse, codeLiaison: code };
  }

  private async genererCodeLiaison(nomFamille: string): Promise<string> {
    const base = nomFamille
      .normalize('NFD')
      .replace(/[^A-Za-z]/g, '')
      .toUpperCase()
      .slice(0, 3)
      .padEnd(3, 'X');
    for (let i = 0; i < 20; i++) {
      const code = `${base}-${randomInt(1000, 10000)}`;
      if (!(await this.prisma.user.findUnique({ where: { codeLiaison: code } }))) return code;
    }
    return `${base}-${randomInt(10000, 99999)}`;
  }
}
