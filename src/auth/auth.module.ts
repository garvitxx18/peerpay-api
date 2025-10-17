import { Module, Global } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma.service';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { SmsService } from './sms.service';

@Global()
@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => ({
        secret: cfg.get<string>('JWT_SECRET'),
        signOptions: { issuer: cfg.get('JWT_ISSUER') },
      }),
    }),
  ],
  providers: [PrismaService, AuthService, SmsService],
  controllers: [AuthController],
  exports: [JwtModule], // export the configured JwtService
})
export class AuthModule {}
