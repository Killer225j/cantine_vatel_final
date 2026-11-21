import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { IsIvorianPhone } from '../../../common/validators/is-ivorian-phone.decorator';

/** Rôles ouverts à l'inscription publique. ADMIN et CUISINE sont créés par l'administration. */
export const ROLES_INSCRIPTION = [Role.ELEVE, Role.PARENT] as const;
export type RoleInscription = (typeof ROLES_INSCRIPTION)[number];

export class RegisterDto {
  @ApiProperty({ description: 'Email, unique (sinon 409)', example: 'awa.kone@vatel.ci' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsEmail({}, { message: 'Saisissez une adresse e-mail valide.' })
  email!: string;

  @ApiProperty({
    description: '8 caractères minimum, au moins une majuscule et un chiffre',
    example: 'Cantine2026!',
    minLength: 8,
    format: 'password',
  })
  @IsString()
  @MinLength(8, { message: 'Le mot de passe doit faire au moins 8 caractères.' })
  @Matches(/^(?=.*[A-Z])(?=.*\d).+$/, {
    message: 'Le mot de passe doit contenir au moins une majuscule et un chiffre.',
  })
  password!: string;

  @ApiProperty({ enum: ROLES_INSCRIPTION, example: Role.ELEVE })
  @IsIn(ROLES_INSCRIPTION, { message: 'Choisissez « élève » ou « parent ».' })
  role!: RoleInscription;

  @ApiProperty({ example: 'Awa', maxLength: 80 })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty({ message: 'Saisissez votre prénom.' })
  @MaxLength(80)
  firstName!: string;

  @ApiProperty({ example: 'Koné', maxLength: 80 })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty({ message: 'Saisissez votre nom.' })
  @MaxLength(80)
  lastName!: string;

  @ApiPropertyOptional({
    description: 'Numéro ivoirien, ramené à la forme +225XXXXXXXXXX. Unique.',
    example: '+2250700000099',
  })
  @IsOptional()
  @IsIvorianPhone()
  phone?: string;
}
