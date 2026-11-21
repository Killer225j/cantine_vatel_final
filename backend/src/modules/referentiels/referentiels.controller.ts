import { Body, Controller, ForbiddenException, Get, NotFoundException, Put } from '@nestjs/common';
import { assurerCompteEleve } from '../../shared/codes/code-liaison';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { ArrayUnique, IsArray, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { PrismaService } from '../../shared/prisma/prisma.service';

export class AllergenesEleveDto {
  @ApiProperty({
    example: ['ARACHIDES'],
    description: 'Codes des allergènes déclarés (remplace la liste)',
  })
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  codes!: string[];

  @ApiPropertyOptional({ description: "Pour un parent : l'enfant concerné (id de l'élève)" })
  @IsOptional()
  @IsString()
  enfantId?: string;
}

@ApiTags('Référentiels')
@ApiBearerAuth('access-token')
@Controller()
export class ReferentielsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('allergenes')
  @ApiOperation({ summary: 'Les 14 allergènes réglementaires' })
  allergenes() {
    return this.prisma.allergene.findMany({
      select: { code: true, nom: true },
      orderBy: { nom: 'asc' },
    });
  }

  @Get('eleves/me/allergenes')
  @Roles(Role.ELEVE)
  @ApiOperation({ summary: 'Mes allergies déclarées' })
  async mesAllergenes(@CurrentUser() user: JwtPayload) {
    const eleve = await this.prisma.user.findUnique({
      where: { id: user.sub },
      select: { allergenes: { select: { code: true, nom: true } } },
    });
    return eleve?.allergenes ?? [];
  }

  @Put('eleves/me/allergenes')
  @Roles(Role.ELEVE, Role.PARENT)
  @ApiOperation({
    summary: 'Déclarer les allergies (élève, ou parent pour son enfant)',
    description:
      'Remplace la liste. Les plats concernés sont signalés au menu et le comptoir est alerté au scan.',
  })
  @ApiOkResponse({ description: 'Liste à jour' })
  async declarer(@CurrentUser() user: JwtPayload, @Body() dto: AllergenesEleveDto) {
    let eleveId = user.sub;
    if (user.role === Role.PARENT) {
      if (!dto.enfantId) throw new ForbiddenException('Précisez l’enfant concerné (enfantId).');
      const lien = await this.prisma.lienParent.findUnique({
        where: { parentId_enfantId: { parentId: user.sub, enfantId: dto.enfantId } },
      });
      if (!lien) throw new ForbiddenException('Cet élève n’est pas lié à votre compte.');
      eleveId = dto.enfantId;
    }

    const connus = await this.prisma.allergene.findMany({ where: { code: { in: dto.codes } } });
    if (connus.length !== dto.codes.length) {
      const inconnus = dto.codes.filter((c) => !connus.some((a) => a.code === c));
      throw new NotFoundException(`Allergène inconnu : ${inconnus.join(', ')}`);
    }

    const eleve = await this.prisma.user.update({
      where: { id: eleveId },
      data: { allergenes: { set: connus.map((a) => ({ id: a.id })) } },
      select: { allergenes: { select: { code: true, nom: true } } },
    });
    return eleve.allergenes;
  }

  @Get('eleves/me/profil')
  @Roles(Role.ELEVE)
  @ApiOperation({
    summary: 'Mon profil de cantine',
    description:
      'Classe, code de liaison, parents liés, solde et allergies : tout l\x27écran Profil en un appel.',
  })
  async profil(@CurrentUser() user: JwtPayload) {
    await assurerCompteEleve(this.prisma, user.sub);
    const eleve = await this.prisma.user.findUnique({
      where: { id: user.sub },
      select: {
        firstName: true,
        lastName: true,
        classe: true,
        codeLiaison: true,
        allergenes: { select: { code: true, nom: true } },
        portefeuille: { select: { solde: true, seuilAlerte: true } },
        parents: { select: { parent: { select: { firstName: true, lastName: true } } } },
      },
    });
    if (!eleve) throw new NotFoundException('Profil introuvable.');
    const solde = eleve.portefeuille?.solde ?? 0;
    const seuilAlerte = eleve.portefeuille?.seuilAlerte ?? 2000;
    return {
      nom: `${eleve.firstName ?? ''} ${eleve.lastName ?? ''}`.trim(),
      classe: eleve.classe,
      codeLiaison: eleve.codeLiaison,
      allergenes: eleve.allergenes,
      solde,
      seuilAlerte,
      soldeBas: solde < seuilAlerte,
      parents: eleve.parents.map((l) =>
        `${l.parent.firstName ?? ''} ${l.parent.lastName ?? ''}`.trim(),
      ),
    };
  }

  @Get('eleves/me/code-liaison')
  @Roles(Role.ELEVE)
  @ApiOperation({ summary: 'Mon code à donner à mon parent' })
  async codeLiaison(@CurrentUser() user: JwtPayload) {
    await assurerCompteEleve(this.prisma, user.sub);
    const eleve = await this.prisma.user.findUnique({
      where: { id: user.sub },
      select: { codeLiaison: true },
    });
    return { codeLiaison: eleve?.codeLiaison ?? null };
  }
}
