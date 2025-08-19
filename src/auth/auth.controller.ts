import {
  Body,
  Controller,
  ForbiddenException,
  Ip,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { Throttle } from '@nestjs/throttler';
import { RegisterAdminDto } from './dto/register-admin.dto';
import { LoginThrottleGuard } from './guards/login-throttle.guard';
import { LoginUserDto } from './dto/login-user.dto';
import { RefreshTokenGuard } from './guards/refresh-token.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { User } from './entities/user.entity';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly loginThrottleGuard: LoginThrottleGuard,
  ) {}

  @Post('admin/register')
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  registerAdmin(@Body() registerAdminDto: RegisterAdminDto) {
    if (process.env.NODE_ENV === 'production') {
      throw new ForbiddenException(
        'Admin registration is not allowed in production',
      );
    }

    return this.authService.registerAdmin(registerAdminDto);
  }

  @Post('login')
  @UseGuards(LoginThrottleGuard)
  async login(@Ip() ip: string, @Body() loginUserDto: LoginUserDto) {
    try {
      const result = await this.authService.login(loginUserDto, ip);
      // Si el login es exitoso, limpiar intentos fallidos
      this.loginThrottleGuard.clearFailedAttempts(ip);
      return result;
    } catch (error) {
      // Si el login falla, registrar intento fallido
      this.loginThrottleGuard.recordFailedAttempt(ip);
      throw error;
    }
  }

  @Post('refresh-token')
  @UseGuards(RefreshTokenGuard)
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 refresh por minuto
  refreshToken(
    @Body('refreshToken') refreshToken: string,
    @CurrentUser() user: User,
  ) {
    return this.authService.refreshToken(refreshToken, user);
  }
}
