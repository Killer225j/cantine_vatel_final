import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiProperty,
  ApiPropertyOptional,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { ComptesService } from './comptes.service';

export class LienDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  parentId!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  enfantId!: string;
}

export class ActifDto {
  @ApiProperty()
  @IsBoolean()
  actif!: boolean;
}

export class InviterDto {
  @ApiProperty({ example: 'Awa' })
  @IsString()
  @IsNotEmpty({ message: 'Le prénom est obligatoire.' })
  @MaxLength(60)
  prenom!: string;

  @ApiProperty({ example: 'Traoré' })
  @IsString()
  @IsNotEmpty({ message: 'Le nom est obligatoire.' })
  @MaxLength(60)
  nom!: string;

  @ApiProperty({ example: 'awa.traore@vatel.ci' })
  @IsEmail({}, { message: 'Email invalide.' })
  email!: string;

  @ApiProperty({ enum: Role })
  @IsEnum(Role, { message: 'Rôle inconnu.' })
  role!: Role;

  @ApiPropertyOptional({ example: 'Bachelor 1' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  classe?: string;
}

@ApiTags('Comptes')
@ApiBearerAuth('access-token')
@Roles(Role.ADMIN)
@Controller('utilisateurs')
export class ComptesController {
  constructor(private readonly comptes: ComptesService) {}

  @Get()
  @ApiOperation({ summary: 'Élèves, parents et personnel, avec les compteurs' })
  lister() {
    return this.comptes.lister();
  }

  @Post()
  @ApiOperation({ summary: 'Inviter un compte (mot de passe temporaire renvoyé une seule fois)' })
  inviter(@Body() dto: InviterDto) {
    return this.comptes.inviter(dto);
  }

  @Post('liens')
  @ApiOperation({ summary: 'Lier un parent à un élève' })
  lier(@Body() dto: LienDto) {
    return this.comptes.lier(dto.parentId, dto.enfantId);
  }

  @Patch(':id/actif')
  @ApiOperation({ summary: 'Activer ou désactiver un compte' })
  actif(@CurrentUser() user: JwtPayload, @Param('id') id: string, @Body() dto: ActifDto) {
    return this.comptes.definirActif(user.sub, id, dto.actif);
  }
}
