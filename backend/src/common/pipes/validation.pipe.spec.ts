import { ArgumentMetadata, BadRequestException } from '@nestjs/common';
import { IsInt, IsString } from 'class-validator';
import { globalValidationPipe } from './validation.pipe';

class CreneauDto {
  @IsString()
  doctorId!: string;

  @IsInt()
  duree!: number;
}

const metadata: ArgumentMetadata = { type: 'body', metatype: CreneauDto };

/**
 * Le pipe est global : ce qu'il laisse passer arrive tel quel dans les services. Trois
 * garanties comptent — le rejet du champ inconnu, la conversion implicite, et le message
 * d'erreur champ par champ.
 */
describe('globalValidationPipe', () => {
  it('convertit la charge utile en instance du DTO', async () => {
    const valeur = await globalValidationPipe.transform(
      { doctorId: 'doctor-yao', duree: 30 },
      metadata,
    );

    expect(valeur).toBeInstanceOf(CreneauDto);
  });

  it('convertit implicitement les nombres reçus en texte', async () => {
    const valeur = (await globalValidationPipe.transform(
      { doctorId: 'doctor-yao', duree: '30' },
      metadata,
    )) as CreneauDto;

    expect(valeur.duree).toBe(30);
  });

  it('rejette un champ non déclaré plutôt que de l’ignorer silencieusement', async () => {
    await expect(
      globalValidationPipe.transform(
        { doctorId: 'doctor-yao', duree: 30, isAdmin: true },
        metadata,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('signale les champs fautifs un par un', async () => {
    await expect(globalValidationPipe.transform({ duree: 'trente' }, metadata)).rejects.toThrow(
      BadRequestException,
    );
  });
});
