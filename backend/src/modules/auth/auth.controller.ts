import { Throttle } from '@nestjs/throttler';
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser, JwtPayload } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { LimiteDebitGuard } from '../../common/guards/limite-debit.guard';
import { SEED_ACCOUNTS } from '../../common/swagger/examples';
import { AuthService, AuthTokens, MeResponse } from './auth.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterDto } from './dto/register.dto';
import { UpdateMeDto } from './dto/update-me.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @UseGuards(LimiteDebitGuard)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Post('register')
  @ApiOperation({
    summary: 'Créer un compte élève ou parent',
    description:
      "Inscription publique. Les comptes ADMIN et CUISINE sont créés par l'administration.",
  })
  @ApiCreatedResponse({ type: AuthTokens, description: 'Compte créé, jetons retournés' })
  @ApiConflictResponse({ description: 'Email ou téléphone déjà utilisé' })
  @ApiBadRequestResponse({ description: 'Champ invalide ou mot de passe trop faible' })
  @ApiTooManyRequestsResponse({ description: 'Trop de tentatives depuis cette adresse' })
  register(@Body() dto: RegisterDto): Promise<AuthTokens> {
    return this.authService.register(dto);
  }

  @Public()
  @UseGuards(LimiteDebitGuard)
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Se connecter (email ou téléphone)' })
  @ApiBody({
    type: LoginDto,
    examples: Object.fromEntries(
      Object.entries(SEED_ACCOUNTS).map(([nom, compte]) => [nom, { summary: nom, value: compte }]),
    ),
  })
  @ApiOkResponse({ type: AuthTokens })
  @ApiUnauthorizedResponse({ description: 'Identifiants invalides ou compte désactivé' })
  @ApiTooManyRequestsResponse({ description: 'Trop de tentatives depuis cette adresse' })
  login(@Body() dto: LoginDto): Promise<AuthTokens> {
    return this.authService.login(dto);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Renouveler la paire de jetons' })
  @ApiOkResponse({ type: AuthTokens })
  @ApiUnauthorizedResponse({ description: 'Refresh token invalide, expiré ou révoqué' })
  refresh(@Body() dto: RefreshTokenDto): Promise<AuthTokens> {
    return this.authService.refresh(dto);
  }

  @ApiBearerAuth('access-token')
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Se déconnecter (révoque le refresh token)' })
  @ApiNoContentResponse()
  logout(@CurrentUser() user: JwtPayload): Promise<void> {
    return this.authService.logout(user.sub);
  }

  @ApiBearerAuth('access-token')
  @Patch('change-password')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Changer son mot de passe' })
  @ApiNoContentResponse()
  @ApiBadRequestResponse({ description: 'Mot de passe actuel incorrect ou nouveau trop faible' })
  changePassword(@CurrentUser() user: JwtPayload, @Body() dto: ChangePasswordDto): Promise<void> {
    return this.authService.changePassword(user.sub, dto);
  }

  @ApiBearerAuth('access-token')
  @Get('me')
  @ApiOperation({ summary: 'Mon compte' })
  @ApiOkResponse({ type: MeResponse })
  getMe(@CurrentUser() user: JwtPayload): Promise<MeResponse> {
    return this.authService.getMe(user.sub);
  }

  @ApiBearerAuth('access-token')
  @Patch('me')
  @ApiOperation({ summary: 'Corriger prénom, nom ou téléphone' })
  @ApiOkResponse({ type: MeResponse })
  @ApiConflictResponse({ description: 'Numéro déjà utilisé par un autre compte' })
  updateMe(@CurrentUser() user: JwtPayload, @Body() dto: UpdateMeDto): Promise<MeResponse> {
    return this.authService.updateMe(user.sub, dto);
  }
}
