import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString, ValidateIf } from 'class-validator';
import { SEED_ACCOUNTS } from '../../../common/swagger/examples';

/** Connexion par email **ou** par téléphone. Si les deux sont envoyés, l'email l'emporte. */
export class LoginDto {
  @ApiProperty({
    required: false,
    description: 'Email du compte. À fournir si `phone` est absent.',
    example: SEED_ACCOUNTS.eleve.email,
    format: 'email',
  })
  @ValidateIf((dto: LoginDto) => !dto.phone)
  @IsEmail({}, { message: 'Saisissez une adresse e-mail valide, ou votre numéro de téléphone.' })
  email?: string;

  @ApiProperty({
    required: false,
    description: 'Numéro ivoirien, sous toute forme usuelle (`0700000010`, `+225 07 00 00 00 10`).',
    example: '+2250700000010',
  })
  @IsOptional()
  @IsString({ message: 'Le numéro de téléphone n’est pas valide.' })
  phone?: string;

  @ApiProperty({ example: SEED_ACCOUNTS.eleve.password, format: 'password' })
  @IsString({ message: 'Saisissez votre mot de passe.' })
  @IsNotEmpty({ message: 'Saisissez votre mot de passe.' })
  password!: string;
}
