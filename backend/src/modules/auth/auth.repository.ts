import { Injectable } from '@nestjs/common';
import { Prisma, User } from '@prisma/client';
import { PrismaService } from '../../shared/prisma/prisma.service';

@Injectable()
export class AuthRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  /** `phone` doit déjà être sous sa forme canonique (voir `normalizePhone`). */
  findByPhone(phone: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { phone } });
  }

  findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  create(data: Prisma.UserCreateInput): Promise<User> {
    return this.prisma.user.create({ data });
  }

  /** Ce qu'une personne corrige elle-même : ni rôle, ni adresse, ni mot de passe. */
  updateIdentity(
    id: string,
    data: Partial<Pick<User, 'firstName' | 'lastName' | 'phone'>>,
  ): Promise<User> {
    return this.prisma.user.update({ where: { id }, data });
  }

  async updateRefreshToken(userId: string, token: string | null): Promise<void> {
    await this.prisma.user.update({ where: { id: userId }, data: { refreshToken: token } });
  }

  async updatePasswordHash(userId: string, passwordHash: string): Promise<void> {
    await this.prisma.user.update({ where: { id: userId }, data: { passwordHash } });
  }
}
