import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PrismaService } from '../prisma.service';
import { UsersController } from './users.controller';
import { JwtGuard } from './jwt.guard';

@Module({
  imports: [JwtModule],
  providers: [PrismaService, JwtGuard],
  controllers: [UsersController],
})
export class UsersModule {}
