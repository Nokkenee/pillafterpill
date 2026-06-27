import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true, email: true, username: true, role: true,
        isVerified: true, avatarUrl: true, createdAt: true,
        _count: { select: { bugReports: true, forumTopics: true } },
      },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async getById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true, username: true, role: true,
        avatarUrl: true, createdAt: true,
        _count: { select: { bugReports: true, forumTopics: true } },
      },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async changePassword(userId: string, oldPassword: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const match = await bcrypt.compare(oldPassword, user.passwordHash);
    if (!match) throw new BadRequestException('Old password is incorrect');

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await this.prisma.user.update({ where: { id: userId }, data: { passwordHash } });

    return { message: 'Password changed successfully' };
  }

  async getUserBugReports(userId: string) {
    return this.prisma.bugReport.findMany({
      where: { authorId: userId, isArchived: false },
      include: { _count: { select: { comments: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getUserTopics(userId: string) {
    return this.prisma.forumTopic.findMany({
      where: { authorId: userId },
      include: { _count: { select: { comments: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }
}