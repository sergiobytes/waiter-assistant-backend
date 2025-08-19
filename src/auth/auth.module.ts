import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CustomJwtModule } from '../custom-jwt/custom-jwt.module';
import { CustomPassportModule } from '../custom-passport/custom-passport.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { CommonModule } from 'src/common/common.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { LoginThrottleGuard } from './guards/login-throttle.guard';

@Module({
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, LoginThrottleGuard],
  imports: [
    TypeOrmModule.forFeature([User]),
    ConfigModule,
    CustomPassportModule,
    CustomJwtModule,
    CommonModule,
  ],
  exports: [TypeOrmModule, JwtStrategy, CustomPassportModule],
})
export class AuthModule {}
