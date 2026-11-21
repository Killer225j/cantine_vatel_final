/**
 * Données de démonstration. Idempotent : peut être rejoué sans doublon (upsert par email).
 *
 *   En local  : yarn seed
 *   Sur Render: DATABASE_URL="<External Database URL de Render>" yarn seed  (depuis le poste)
 */
import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { MOT_DE_PASSE_DEMO, SEED_ACCOUNTS } from '../src/common/swagger/examples';

const prisma = new PrismaClient();

const COMPTES: { email: string; role: Role; firstName: string; lastName: string; phone: string }[] =
  [
    {
      email: SEED_ACCOUNTS.admin.email,
      role: Role.ADMIN,
      firstName: 'Yann',
      lastName: 'ZAOU',
      phone: '+2250700000001',
    },
    {
      email: SEED_ACCOUNTS.cuisine.email,
      role: Role.CUISINE,
      firstName: 'Bolou',
      lastName: 'ZAOU',
      phone: '+2250700000002',
    },
    {
      email: SEED_ACCOUNTS.parent.email,
      role: Role.PARENT,
      firstName: 'Aya',
      lastName: 'Koffi',
      phone: '+2250700000003',
    },
    {
      email: SEED_ACCOUNTS.eleve.email,
      role: Role.ELEVE,
      firstName: 'Koffi',
      lastName: 'Koffi',
      phone: '+2250700000010',
    },
  ];

async function main(): Promise<void> {
  const passwordHash = await bcrypt.hash(MOT_DE_PASSE_DEMO, 12);
  for (const compte of COMPTES) {
    await prisma.user.upsert({
      where: { email: compte.email },
      update: { role: compte.role, firstName: compte.firstName, lastName: compte.lastName },
      create: { ...compte, passwordHash },
    });
  }
  console.log(`Seed : ${COMPTES.length} comptes prêts (mot de passe : ${MOT_DE_PASSE_DEMO})`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
