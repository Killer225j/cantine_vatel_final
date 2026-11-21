import { createHash, randomUUID, timingSafeEqual } from 'crypto';
import { ApiProperty } from '@nestjs/swagger';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Role, User } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { ERROR_REASON } from '../../common/errors/error-reason';
import { toUniqueConflict } from '../../common/errors/unique-conflict';
import { normalizePhone } from '../../common/utils/phone.util';
import { AppConfig } from '../../config/configuration';
import { AuthRepository } from './auth.repository';
import { ChangePasswordDto } from './dto/change-password.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterDto } from './dto/register.dto';
import { UpdateMeDto } from './dto/update-me.dto';

const BCRYPT_ROUNDS = 12;

export class MeResponse {
  @ApiProperty() id!: string;
  @ApiProperty() email!: string;
  @ApiProperty({ nullable: true, type: String }) firstName!: string | null;
  @ApiProperty({ nullable: true, type: String }) lastName!: string | null;
  @ApiProperty({ nullable: true, type: String }) phone!: string | null;
  @ApiProperty({ enum: Role, enumName: 'Role' }) role!: Role;
}

export class AuthTokens {
  @ApiProperty({ description: 'JWT d’accès', example: 'eyJhbGciOiJIUzI1NiIs...' })
  accessToken!: string;

  @ApiProperty({ description: 'JWT de rafraîchissement', example: 'eyJhbGciOiJIUzI1NiIs...' })
  refreshToken!: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly authRepository: AuthRepository,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService<AppConfig, true>,
  ) {}

  /** Inscription publique d'un élève ou d'un parent. */
  async register(dto: RegisterDto): Promise<AuthTokens> {
    if (await this.authRepository.findByEmail(dto.email)) {
      throw new ConflictException('Cette adresse e-mail est déjà utilisée.');
    }

    let phone: string | null = null;
    if (dto.phone) {
      phone = normalizePhone(dto.phone);
      if (!phone) throw new BadRequestException('Numéro de téléphone ivoirien attendu.');
    }

    let user: User;
    try {
      user = await this.authRepository.create({
        email: dto.email,
        phone,
        passwordHash: await bcrypt.hash(dto.password, BCRYPT_ROUNDS),
        firstName: dto.firstName,
        lastName: dto.lastName,
        role: dto.role,
      });
    } catch (err: unknown) {
      throw toUniqueConflict(err) ?? err;
    }

    return this.openSession(user);
  }

  async login(dto: LoginDto): Promise<AuthTokens> {
    const user = await this.findForLogin(dto);
    // Compte inconnu et mauvais mot de passe : même réponse, rien ne dit qui est inscrit.
    if (!user || !(await bcrypt.compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException({
        message: 'Identifiant ou mot de passe incorrect.',
        reason: ERROR_REASON.INVALID_CREDENTIALS,
      });
    }
    if (!user.isActive) {
      throw new UnauthorizedException({
        message: 'Ce compte est désactivé. Contactez l’administration de la cantine.',
        reason: ERROR_REASON.ACCOUNT_DEACTIVATED,
      });
    }
    return this.openSession(user);
  }

  async refresh(dto: RefreshTokenDto): Promise<AuthTokens> {
    const sessionExpired = new UnauthorizedException({
      message: 'Votre session a expiré. Reconnectez-vous.',
      reason: ERROR_REASON.SESSION_EXPIRED,
    });

    let payload: { sub: string };
    try {
      payload = this.jwtService.verify(dto.refreshToken, {
        secret: this.configService.get('jwt', { infer: true }).refreshSecret,
      });
    } catch {
      throw sessionExpired;
    }

    const user = await this.authRepository.findById(payload.sub);
    if (!user?.refreshToken || !user.isActive) throw sessionExpired;
    if (!memeEmpreinte(empreinte(dto.refreshToken), user.refreshToken)) throw sessionExpired;

    return this.openSession(user);
  }

  async logout(userId: string): Promise<void> {
    await this.authRepository.updateRefreshToken(userId, null);
  }

  async changePassword(userId: string, dto: ChangePasswordDto): Promise<void> {
    const user = await this.authRepository.findById(userId);
    if (!user) throw new UnauthorizedException();
    if (!(await bcrypt.compare(dto.currentPassword, user.passwordHash))) {
      throw new BadRequestException('Le mot de passe actuel est incorrect.');
    }
    await this.authRepository.updatePasswordHash(
      userId,
      await bcrypt.hash(dto.newPassword, BCRYPT_ROUNDS),
    );
  }

  async getMe(userId: string): Promise<MeResponse> {
    const user = await this.authRepository.findById(userId);
    if (!user) throw new UnauthorizedException();
    return toMeResponse(user);
  }

  /** Les champs absents du corps restent tels quels. */
  async updateMe(userId: string, dto: UpdateMeDto): Promise<MeResponse> {
    const changes: Partial<Pick<User, 'firstName' | 'lastName' | 'phone'>> = {};
    if (dto.firstName !== undefined) changes.firstName = dto.firstName;
    if (dto.lastName !== undefined) changes.lastName = dto.lastName;
    if (dto.phone !== undefined) {
      const phone = normalizePhone(dto.phone);
      if (!phone) throw new BadRequestException('Numéro de téléphone ivoirien attendu.');
      changes.phone = phone;
    }
    if (Object.keys(changes).length === 0) return this.getMe(userId);

    try {
      return toMeResponse(await this.authRepository.updateIdentity(userId, changes));
    } catch (err: unknown) {
      throw toUniqueConflict(err) ?? err;
    }
  }

  private findForLogin(dto: LoginDto): Promise<User | null> {
    if (dto.email) return this.authRepository.findByEmail(dto.email.trim().toLowerCase());
    const phone = normalizePhone(dto.phone);
    if (!phone) throw new BadRequestException('Numéro de téléphone ivoirien attendu.');
    return this.authRepository.findByPhone(phone);
  }

  /** Émet une paire de jetons et ne garde que l'empreinte du refresh token. */
  private async openSession(user: User): Promise<AuthTokens> {
    const jwt = this.configService.get('jwt', { infer: true });
    // `jti` : deux jetons émis dans la même seconde seraient sinon identiques, et un refresh
    // token déjà utilisé redeviendrait valide.
    const payload = { sub: user.id, email: user.email, role: user.role, jti: randomUUID() };

    const tokens: AuthTokens = {
      accessToken: this.jwtService.sign(payload, { secret: jwt.secret, expiresIn: jwt.expiresIn }),
      refreshToken: this.jwtService.sign(payload, {
        secret: jwt.refreshSecret,
        expiresIn: jwt.refreshExpiresIn,
      }),
    };
    await this.authRepository.updateRefreshToken(user.id, empreinte(tokens.refreshToken));
    return tokens;
  }
}

/**
 * Empreinte SHA-256 d'un refresh token.
 *
 * Pas bcrypt : bcrypt ne lit que les 72 premiers octets, et deux JWT d'un même compte partagent
 * leur en-tête et le début de leur contenu. Un ancien refresh token « correspondait » donc au
 * condensat du nouveau. Un jeton signé est déjà aléatoire : un hachage rapide suffit, et la
 * comparaison se fait en temps constant.
 */
function empreinte(jeton: string): string {
  return createHash('sha256').update(jeton).digest('hex');
}

function memeEmpreinte(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

function toMeResponse(user: User): MeResponse {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    phone: user.phone,
    role: user.role,
  };
}
