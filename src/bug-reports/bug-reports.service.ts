import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBugReportDto, UpdateBugStatusDto } from './dto';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class BugReportsService {
  constructor(private prisma: PrismaService,
    private notifications: NotificationsService) {}

  async findAll(params: {
    archived?: boolean;
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    priority?: string;
  }) {
    const { archived = false, page = 1, limit = 20, search, status, priority } = params;
    const skip = (page - 1) * limit;

    const where: any = { isArchived: archived };
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (status) where.status = status;
    if (priority) where.priority = priority;

    const [items, total] = await Promise.all([
      this.prisma.bugReport.findMany({
        where,
        include: {
          author: { select: { id: true, username: true, role: true } },
          tags: true,
          _count: { select: { comments: true, files: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.bugReport.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string) {
    const report = await this.prisma.bugReport.findUnique({
      where: { id },
      include: {
        author: { select: { id: true, username: true, role: true } },
        files: true,
        tags: true,
        comments: {
          include: {
            author: { select: { id: true, username: true, role: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!report) throw new NotFoundException('Bug report not found');
    return report;
  }

  async create(dto: CreateBugReportDto, authorId: string) {
  return this.prisma.bugReport.create({
    data: {
      title: dto.title,
      description: dto.description,
      priority: dto.priority ?? 'MEDIUM',
      gameVersion: '—',
      authorId,
    },
  });
  }

  async updateStatus(id: string, dto: UpdateBugStatusDto, userRole: string) {
    if (!['DEVELOPER', 'ADMIN', 'MODERATOR'].includes(userRole)) {
      throw new ForbiddenException('Only developers and moderators can change status');
    }

    const report = await this.prisma.bugReport.findUnique({ where: { id } });
    if (!report) throw new NotFoundException('Bug report not found');

    const updated = await this.prisma.bugReport.update({
      where: { id },
      data: { status: dto.status },
    });

    await this.notifications.create(report.authorId, 'status_change', {
      reportId: id,
      reportTitle: report.title,
      newStatus: dto.status,
    });

    return updated;
  }

  async archive(id: string, userRole: string) {
    if (!['MODERATOR', 'ADMIN'].includes(userRole)) {
      throw new ForbiddenException('Only moderators can archive reports');
    }

    const report = await this.prisma.bugReport.findUnique({ where: { id } });
    if (!report) throw new NotFoundException('Bug report not found');

    return this.prisma.bugReport.update({
      where: { id },
      data: { isArchived: true },
    });
  }

  async delete(id: string, userId: string, userRole: string) {
    const report = await this.prisma.bugReport.findUnique({ where: { id } });
    if (!report) throw new NotFoundException('Bug report not found');

    if (report.authorId !== userId && !['MODERATOR', 'ADMIN'].includes(userRole)) {
      throw new ForbiddenException('You can only delete your own reports');
    }

    return this.prisma.bugReport.delete({ where: { id } });
  }

  async addComment(reportId: string, body: string, authorId: string, parentId?: string) {
    const report = await this.prisma.bugReport.findUnique({
      where: { id: reportId },
      include: { author: true },
    });
    if (!report) throw new NotFoundException('Bug report not found');

    const comment = await this.prisma.bugComment.create({
      data: { body, reportId, authorId, parentId: parentId ?? null },
      include: {
        author: { select: { id: true, username: true, role: true } },
        replies: {
          include: { author: { select: { id: true, username: true, role: true } } },
        },
      },
    });

    // уведомление автору репорта если комментирует кто-то другой
    if (report.authorId !== authorId) {
      await this.notifications.create(report.authorId, 'bug_comment', {
        reportId,
        reportTitle: report.title,
        commentId: comment.id,
        authorId,
      });
    }

    // уведомление автору родительского комментария
    if (parentId) {
      const parent = await this.prisma.bugComment.findUnique({ where: { id: parentId } });
      if (parent && parent.authorId !== authorId && parent.authorId !== report.authorId) {
        await this.notifications.create(parent.authorId, 'comment_reply', {
          reportId,
          reportTitle: report.title,
          commentId: comment.id,
          authorId,
        });
      }
    }

    return comment;
  }


  async deleteComment(commentId: string, userId: string, userRole: string) {
    const comment = await this.prisma.bugComment.findUnique({
      where: { id: commentId },
    });
    if (!comment) throw new NotFoundException('Comment not found');

    if (comment.authorId !== userId && !['MODERATOR', 'ADMIN'].includes(userRole)) {
      throw new ForbiddenException('You can only delete your own comments');
    }

    return this.prisma.bugComment.delete({ where: { id: commentId } });
  }

}