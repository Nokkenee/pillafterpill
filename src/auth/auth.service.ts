import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto, LoginDto } from './dto';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import * as nodemailer from 'nodemailer';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
  ) {}

  // ─── Registration ───────────────────────────────

  async register(dto: RegisterDto) {
    const exists = await this.prisma.user.findFirst({
        where: { OR: [{ email: dto.email }, { username: dto.username }] },
    });

    if (exists) {
        throw new BadRequestException('Email or username already taken');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);

    const user = await this.prisma.user.create({
        data: { email: dto.email, username: dto.username, passwordHash },
    });

    await this.sendVerificationEmail(user.id, user.email);

    return { message: 'Registration successful. Please verify your email.' };
  }

  // ─── Email Verification ─────────────────────────

  async verifyEmail(token: string) {
    const emailToken = await this.prisma.emailToken.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!emailToken || emailToken.type !== 'EMAIL_VERIFY') {
      throw new BadRequestException('Invalid token');
    }

    if (emailToken.expiresAt < new Date()) {
      throw new BadRequestException('Token expired');
    }

    if (emailToken.usedAt) {
      throw new BadRequestException('Token already used');
    }

    await this.prisma.user.update({
      where: { id: emailToken.userId },
      data: { isVerified: true },
    });

    await this.prisma.emailToken.update({
      where: { token },
      data: { usedAt: new Date() },
    });

    return { message: 'Email verified successfully' };
  }

  // ─── Login ──────────────────────────────────────

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [{ email: dto.login }, { username: dto.login }],
      },
    });

    if (!user) throw new UnauthorizedException('Invalid credentials');

    const passwordMatch = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordMatch) throw new UnauthorizedException('Invalid credentials');

    if (!user.isVerified) {
      throw new UnauthorizedException('Please verify your email first');
    }

    const tokens = await this.generateTokens(user.id, user.role);
    return { ...tokens, user: { id: user.id, username: user.username, role: user.role } };
  }

  // ─── Token Generation ───────────────────────────

  async generateTokens(userId: string, role: string) {
    const payload = { sub: userId, role };

    const accessToken = this.jwt.sign(payload, {
      secret: this.config.get('JWT_ACCESS_SECRET'),
      expiresIn: this.config.get('JWT_ACCESS_EXPIRES'),
    });

    const refreshToken = this.jwt.sign(payload, {
      secret: this.config.get('JWT_REFRESH_SECRET'),
      expiresIn: this.config.get('JWT_REFRESH_EXPIRES'),
    });

    return { accessToken, refreshToken };
  }

  // ─── Send Verification Email ────────────────────

  private async sendVerificationEmail(userId: string, email: string) {
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await this.prisma.emailToken.create({
        data: { userId, token, type: 'EMAIL_VERIFY', expiresAt },
    });

    const verifyUrl = `${this.config.get('FRONTEND_URL')}/verify-email?token=${token}`;

    console.log('Sending email to:', email);
    console.log('Verify URL:', verifyUrl);
    console.log('MAIL_USER:', this.config.get('MAIL_USER'));

    const transporter = nodemailer.createTransport({
        host: this.config.get('MAIL_HOST'),
        port: Number(this.config.get('MAIL_PORT')),
        secure: false,
        auth: {
        user: this.config.get('MAIL_USER'),
        pass: this.config.get('MAIL_PASS'),
        },
    });

    try {
        const info = await transporter.sendMail({
        from: this.config.get('MAIL_FROM'),
        to: email,
        subject: 'Verify your email - Bug Forum',
        html: `<p>Click the link to verify your email:</p><a href="${verifyUrl}">${verifyUrl}</a>`,
        });
        console.log('Email sent:', info.messageId);
    } catch (error) {
        console.error('Email error:', error.message);
    }
  }

  // ─── Refresh token endpoint ────────────────────
  async refresh(refreshToken: string) {
    try {
        const payload = this.jwt.verify(refreshToken, {
        secret: this.config.get('JWT_REFRESH_SECRET'),
        });

        const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        });

        if (!user) throw new UnauthorizedException('User not found');

        return this.generateTokens(user.id, user.role);
    } catch {
        throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  // ─── Password refresh/recovery ────────────────────
  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) return { message: 'If email exists, reset link will be sent' };

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 час

    await this.prisma.emailToken.create({
      data: { userId: user.id, token, type: 'PASSWORD_RESET', expiresAt },
    });

    const resetUrl = `${this.config.get('FRONTEND_URL')}/reset-password?token=${token}`;

    const transporter = nodemailer.createTransport({
      host: this.config.get('MAIL_HOST'),
      port: Number(this.config.get('MAIL_PORT')),
      secure: false,
      auth: { user: this.config.get('MAIL_USER'), pass: this.config.get('MAIL_PASS') },
    });

    await transporter.sendMail({
      from: this.config.get('MAIL_FROM'),
      to: email,
      subject: 'Password Reset - Bug Forum',
      html: `<p>Reset your password:</p><a href="${resetUrl}">${resetUrl}</a><p>Link expires in 1 hour.</p>`,
    });

    return { message: 'If email exists, reset link will be sent' };
  }

  async resetPassword(token: string, newPassword: string) {
    const emailToken = await this.prisma.emailToken.findUnique({
      where: { token },
    });

    if (!emailToken || emailToken.type !== 'PASSWORD_RESET') {
      throw new BadRequestException('Invalid token');
    }
    if (emailToken.expiresAt < new Date()) {
      throw new BadRequestException('Token expired');
    }
    if (emailToken.usedAt) {
      throw new BadRequestException('Token already used');
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);

    await this.prisma.user.update({
      where: { id: emailToken.userId },
      data: { passwordHash },
    });

    await this.prisma.emailToken.update({
      where: { token },
      data: { usedAt: new Date() },
    });

    return { message: 'Password reset successfully' };
  }

}