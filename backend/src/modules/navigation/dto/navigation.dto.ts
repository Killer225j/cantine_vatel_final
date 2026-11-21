import { ApiProperty } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { ICONES, IconeNavigation } from '../navigation.definition';

export class EntreeNavigationDto {
  @ApiProperty({ example: 'Tableau de bord' })
  titre!: string;

  @ApiProperty({
    description: 'Clé stable sur laquelle le client retrouve sa route',
    example: 'admin.tableau-de-bord',
  })
  slug!: string;

  @ApiProperty({ enum: ICONES, enumName: 'IconeNavigation', nullable: true, example: 'tableau' })
  icon!: IconeNavigation | null;

  @ApiProperty({ type: () => [EntreeNavigationDto] })
  options!: EntreeNavigationDto[];
}

export class NavigationDto {
  @ApiProperty({ enum: Role, enumName: 'Role' })
  role!: Role;

  @ApiProperty({ type: () => [EntreeNavigationDto] })
  menu!: EntreeNavigationDto[];

  @ApiProperty({
    nullable: true,
    type: String,
    description: "Slug de l'écran d'arrivée",
    example: 'admin.tableau-de-bord',
  })
  accueil!: string | null;
}
