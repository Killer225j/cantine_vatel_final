import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtPayload } from '../../../common/decorators/current-user.decorator';
import { ERROR_REASON } from '../../../common/errors/error-reason';
import { AppConfig } from '../../../config/configuration';
import { AuthRepository } from '../auth.repository';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService<AppConfig, true>,
    private readonly authRepository: AuthRepository,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get('jwt', { infer: true }).secret,
    });
  }

  async validate(payload: JwtPayload): Promise<JwtPayload> {
    if (!payload.sub) {
      throw new UnauthorizedException();
    }

    const user = await this.authRepository.findById(payload.sub);
    if (!user || !user.isActive) {
      throw new UnauthorizedException({
        message: 'Ce compte est désactivé. Contactez l’administration de la cantine.',
        reason: ERROR_REASON.ACCOUNT_DEACTIVATED,
      });
    }

    return payload;
  }
}
