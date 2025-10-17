import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { SmsService } from './sms.service';
import * as bcrypt from 'bcryptjs';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private sms: SmsService,
    private jwt: JwtService,
    private cfg: ConfigService,
  ) {}

  async sendOtp(phone: string) {
    if (!/^\+[0-9]{10,15}$/.test(phone)) throw new BadRequestException('invalid phone');

    const code = String(Math.floor(Math.random() * 1_000_000)).padStart(6, '0');
    const hash = await bcrypt.hash(code, 10);
    const expiresAt = new Date(Date.now() + 3 * 60 * 1000);

    await this.prisma.phone_otp.create({
      data: { phone_e164: phone, code_hash: hash, expires_at: expiresAt },
    });

    await this.sms.send(phone, `Your PeerPay code: ${code} (valid 3 min)`);
    return { ok: true };
  }

  async verifyOtp(phone: string, code: string) {
    const last = await this.prisma.phone_otp.findFirst({
      where: { phone_e164: phone },
      orderBy: { created_at: 'desc' },
    });
    if (!last) throw new UnauthorizedException('OTP not found');
    if (new Date() > last.expires_at) throw new UnauthorizedException('OTP expired');
    const ok = await bcrypt.compare(code, last.code_hash);
    if (!ok) throw new UnauthorizedException('Invalid code');

    // upsert user
    const user = await this.prisma.app_user.upsert({
      where: { phone_e164: phone },
      update: {},
      create: { phone_e164: phone, base_currency: 'INR' },
    });

    // tokens
    const access = await this.jwt.signAsync(
      { sub: user.id, typ: 'access' },
      { expiresIn: `${this.cfg.get('JWT_ACCESS_MINUTES') || 60}m` },
    );

    // store session (hash refresh)
    const refreshHash = await bcrypt.hash('temp', 10);
    const sessionExpiresAt = new Date(Date.now() + (this.cfg.get('JWT_REFRESH_DAYS') || 30) * 24 * 60 * 60 * 1000);
    const session = await this.prisma.user_session.create({
      data: { user_id: user.id, refresh_token_hash: refreshHash, expires_at: sessionExpiresAt },
    });

    const refresh = await this.jwt.signAsync(
      { sub: user.id, typ: 'refresh', sid: session.id },
      { expiresIn: `${this.cfg.get('JWT_REFRESH_DAYS') || 30}d` },
    );

    // Update session with actual refresh token hash
    const actualRefreshHash = await bcrypt.hash(refresh, 10);
    await this.prisma.user_session.update({
      where: { id: session.id },
      data: { refresh_token_hash: actualRefreshHash },
    });

    return { accessToken: access, refreshToken: refresh, userId: user.id };
  }

  async refreshToken(refreshToken: string) {
    // Verify the refresh token
    const decoded = await this.jwt.verifyAsync(refreshToken);
    if (decoded.typ !== 'refresh') {
      throw new UnauthorizedException('Invalid refresh token type');
    }

    const userId = decoded.sub;
    const sessionId = decoded.sid;

    if (!sessionId) {
      throw new UnauthorizedException('Invalid refresh token - missing session ID');
    }

    // Find the specific session
    const session = await this.prisma.user_session.findUnique({
      where: { id: sessionId },
    });

    if (!session || session.user_id !== userId) {
      throw new UnauthorizedException('Refresh token not found');
    }

    if (new Date() > session.expires_at) {
      throw new UnauthorizedException('Refresh token expired');
    }

    // Verify the refresh token hash
    const isValidToken = await bcrypt.compare(refreshToken, session.refresh_token_hash);
    if (!isValidToken) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Generate new access token
    const newAccessToken = await this.jwt.signAsync(
      { sub: userId, typ: 'access' },
      { expiresIn: `${this.cfg.get('JWT_ACCESS_MINUTES') || 60}m` },
    );

    // Generate new refresh token with same session ID
    const newRefreshToken = await this.jwt.signAsync(
      { sub: userId, typ: 'refresh', sid: sessionId },
      { expiresIn: `${this.cfg.get('JWT_REFRESH_DAYS') || 30}d` },
    );

    // Update session with new refresh token hash
    const newRefreshHash = await bcrypt.hash(newRefreshToken, 10);
    const sessionExpiresAt = new Date(Date.now() + (this.cfg.get('JWT_REFRESH_DAYS') || 30) * 24 * 60 * 60 * 1000);
    
    await this.prisma.user_session.update({
      where: { id: sessionId },
      data: {
        refresh_token_hash: newRefreshHash,
        expires_at: sessionExpiresAt,
      },
    });

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      userId: userId,
    };
  }

  async logout(userId: string, all?: boolean, currentSid?: string) {
    if (all) {
      // Delete all sessions for the user
      await this.prisma.user_session.deleteMany({
        where: { user_id: userId },
      });
    } else if (currentSid) {
      // Delete specific session
      await this.prisma.user_session.deleteMany({
        where: { 
          id: currentSid,
          user_id: userId,
        },
      });
    } else {
      // Fallback: delete all sessions for user
      await this.prisma.user_session.deleteMany({
        where: { user_id: userId },
      });
    }

    return { success: true };
  }
}
