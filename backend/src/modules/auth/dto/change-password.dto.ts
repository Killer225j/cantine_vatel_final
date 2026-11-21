import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @ApiProperty({
    description: 'Mot de passe actuel — vérifié avant tout changement',
    example: 'Cantine2026!',
    format: 'password',
  })
  @IsString()
  currentPassword!: string;

  @ApiProperty({
    description: 'Nouveau mot de passe : 8 caractères minimum, une majuscule et un chiffre',
    example: 'Cantine2027!',
    minLength: 8,
    format: 'password',
  })
  @IsString()
  @MinLength(8)
  @Matches(/(?=.*[A-Z])(?=.*\d)/, {
    message: 'newPassword must contain at least one uppercase letter and one digit',
  })
  newPassword!: string;
}
