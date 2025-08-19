import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { Repository } from 'typeorm';
import { RegisterAdminDto } from './dto/register-admin.dto';
import { isUUID } from 'class-validator';
import { UserRoles } from './enums/user-valid-roles';

import * as argon2 from 'argon2';
import { JwtService } from '@nestjs/jwt';
import { LoginUserDto } from './dto/login-user.dto';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async registerAdmin(registerAdminDto: RegisterAdminDto) {
    const { email, password, userName } = registerAdminDto;

    const userExists = await this.findUserByTerm(email);

    if (userExists) {
      this.logger.warn(`Admin registration failed - User exists: ${email}`);
      throw new BadRequestException(
        `Admin registration failed - User exists: ${email}`,
      );
    }

    const hashedPassword = await argon2.hash(password);

    const newUser = this.userRepository.create({
      name: userName,
      email,
      password: hashedPassword,
      role: UserRoles.ADMIN,
    });

    await this.userRepository.save(newUser);

    return {
      message: 'Admin registered successfully',
    };
  }

  async login(loginUserDto: LoginUserDto, ip?: string) {
    const { email, password } = loginUserDto;
    const loginStart = Date.now();

    this.logger.log(`Login attempt for user: ${email} from IP: ${ip}`);

    const user = await this.findUserByTerm(email);

    if (!user) {
      const loginTime = Date.now() - loginStart;
      this.logger.warn(
        `Failed login attempt - User not found: ${email} from IP: ${ip} (${loginTime}ms)`,
      );
      throw new BadRequestException(
        `Failed login attempt - User not found: ${email} from IP: ${ip} (${loginTime}ms)`,
      );
    }

    if (!user.isActive) {
      const loginTime = Date.now() - loginStart;
      this.logger.warn(
        `Failed login attempt - User inactive: ${email} from IP: ${ip} (${loginTime}ms)`,
      );
      throw new BadRequestException(
        `Failed login attempt - User inactive: ${email} from IP: ${ip} (${loginTime}ms)`,
      );
    }

    const isValidPassword = await argon2.verify(user.password, password);
    if (!isValidPassword) {
      const loginTime = Date.now() - loginStart;
      this.logger.warn(
        `Failed login attempt - Invalid credentials: ${email} from IP: ${ip} (${loginTime}ms)`,
      );
      throw new BadRequestException(
        `Failed login attempt - Invalid credentials: ${email} from IP: ${ip} (${loginTime}ms)`,
      );
    }

    const loginTime = Date.now() - loginStart;
    this.logger.log(
      `Successful login for user: ${email} (${user.role}) from IP: ${ip} (${loginTime}ms)`,
    );

    const accessPayload = { userId: user.id, type: 'access' };
    const refreshPayload = { userId: user.id, type: 'refresh' };

    // El CustomJwtModule ya maneja JWT_ACCESS_EXPIRY automáticamente
    const accessToken = this.jwtService.sign(accessPayload);

    // Solo especificamos expiry para refresh token ya que es diferente al default
    const refreshTokenExpiry = this.configService.get(
      'JWT_REFRESH_EXPIRY',
      '7d',
    );
    const refreshToken = this.jwtService.sign(refreshPayload, {
      expiresIn: refreshTokenExpiry,
    });

    return {
      message: `Hola, ${user.name}. Bienvenido a Admin BotBite`,
      access_token: accessToken,
      refresh_token: refreshToken,
    };
  }

  async refreshToken(refreshToken: string, currentUser: User) {
    const refreshStart = Date.now();

    try {
      // Verificar el refresh token
      const payload = this.jwtService.verify(refreshToken);

      // Validar que sea un refresh token
      if (payload.type !== 'refresh') {
        this.logger.warn(
          `Invalid token type for refresh - User: ${currentUser.email}`,
        );
        throw new BadRequestException(
          `Invalid token type for refresh - User: ${currentUser.email}`,
        );
      }

      // Validar que el refresh token pertenezca al usuario autenticado
      if (payload.userId !== currentUser.id) {
        this.logger.warn(
          `Token user mismatch for refresh - User: ${currentUser.email}`,
        );
        throw new BadRequestException(
          `Token user mismatch for refresh - User: ${currentUser.email}`,
        );
      }

      // Validar que el usuario autenticado esté activo
      if (!currentUser.isActive) {
        this.logger.warn(
          `Inactive user attempted refresh - User: ${currentUser.email}`,
        );
        throw new BadRequestException(
          `Inactive user attempted refresh - User: ${currentUser.email}`,
        );
      }

      // Buscar el usuario para asegurar que aún existe y está activo
      const user = await this.findUserByTerm(payload.userId);

      if (!user) {
        this.logger.warn(
          `User not found during refresh - User ID: ${payload.userId}`,
        );
        throw new BadRequestException(
          `User not found during refresh - User ID: ${payload.userId}`,
        );
      }

      if (!user.isActive) {
        this.logger.warn(
          `Inactive user in database during refresh - User: ${user.email}`,
        );
        throw new BadRequestException(
          `Inactive user in database during refresh - User: ${user.email}`,
        );
      }

      // Generar nuevos tokens
      const newAccessPayload = { userId: user.id, type: 'access' };
      const newRefreshPayload = { userId: user.id, type: 'refresh' };

      // El CustomJwtModule ya maneja JWT_ACCESS_EXPIRY automáticamente
      const newAccessToken = this.jwtService.sign(newAccessPayload);

      // Solo especificamos expiry para refresh token
      const refreshTokenExpiry = this.configService.get(
        'JWT_REFRESH_EXPIRY',
        '7d',
      );
      const newRefreshToken = this.jwtService.sign(newRefreshPayload, {
        expiresIn: refreshTokenExpiry,
      });

      const refreshTime = Date.now() - refreshStart;
      this.logger.log(
        `Token refreshed successfully for user: ${user.email} (${user.role}) (${refreshTime}ms)`,
      );

      return {
        access_token: newAccessToken,
        refresh_token: newRefreshToken,
        user: this.sanitizeUserResponse(user),
      };
    } catch {
      const refreshTime = Date.now() - refreshStart;
      this.logger.warn(
        `Token refresh failed for user: ${currentUser.email} (${refreshTime}ms)`,
      );
      throw new BadRequestException(
        `Token refresh failed for user: ${currentUser.email} (${refreshTime}ms)`,
      );
    }
  }

  async findUserByTerm(term: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: isUUID(term) ? [{ id: term }, { email: term }] : { email: term },
      select: ['id', 'name', 'email', 'password', 'isActive'],
    });
  }

  private sanitizeUserResponse(user: User) {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    };
  }
}
