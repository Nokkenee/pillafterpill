import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTopicDto, CreateCommentDto } from './dto';

@Injectable()
export class ForumService {
  constructor(private prisma: PrismaService) {}

  async getTopics(params: { page?: number; limit?: number; search?: string }) {
    const { page = 1, limit = 20, search } = params;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { body: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.forumTopic.findMany({
        where,
        include: {
          author: { select: { id: true, username: true, role: true } },
          _count: { select: { comments: true } },
        },
        orderBy: [{ isPinned: 'desc' }, { createdAt: 'desc' }],
        skip,
        take: limit,
      }),
      this.prisma.forumTopic.count({ where }),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getTopic(id: string) {
    const topic = await this.prisma.forumTopic.findUnique({
      where: { id },
      include: {
        author: { select: { id: true, username: true, role: true } },
        comments: {
          include: {
            author: { select: { id: true, username: true, role: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
    if (!topic) throw new NotFoundException('Topic not found');
    return topic;
  }

  async createTopic(dto: CreateTopicDto, authorId: string) {
    return this.prisma.forumTopic.create({
      data: { title: dto.title, body: dto.body, authorId },
    });
  }

  async createComment(topicId: string, dto: CreateCommentDto, authorId: string) {
    const topic = await this.prisma.forumTopic.findUnique({ where: { id: topicId } });
    if (!topic) throw new NotFoundException('Topic not found');
    if (topic.isLocked) throw new ForbiddenException('Topic is locked');

    return this.prisma.forumComment.create({
      data: { body: dto.body, topicId, authorId },
      include: {
        author: { select: { id: true, username: true, role: true } },
      },
    });
  }

  async deleteTopic(id: string, userId: string, userRole: string) {
    const topic = await this.prisma.forumTopic.findUnique({ where: { id } });
    if (!topic) throw new NotFoundException('Topic not found');

    if (topic.authorId !== userId && !['MODERATOR', 'ADMIN'].includes(userRole)) {
      throw new ForbiddenException('You can only delete your own topics');
    }

    return this.prisma.forumTopic.delete({ where: { id } });
  }

  async lockTopic(id: string, userRole: string) {
    if (!['MODERATOR', 'ADMIN'].includes(userRole)) {
      throw new ForbiddenException('Only moderators can lock topics');
    }

    const topic = await this.prisma.forumTopic.findUnique({ where: { id } });
    if (!topic) throw new NotFoundException('Topic not found');

    return this.prisma.forumTopic.update({
      where: { id },
      data: { isLocked: !topic.isLocked },
    });
  }

  async pinTopic(id: string, userRole: string) {
    if (!['MODERATOR', 'ADMIN'].includes(userRole)) {
      throw new ForbiddenException('Only moderators can pin topics');
    }

    const topic = await this.prisma.forumTopic.findUnique({ where: { id } });
    if (!topic) throw new NotFoundException('Topic not found');

    return this.prisma.forumTopic.update({
      where: { id },
      data: { isPinned: !topic.isPinned },
    });
  }

  async deleteComment(id: string, userId: string, userRole: string) {
    const comment = await this.prisma.forumComment.findUnique({ where: { id } });
    if (!comment) throw new NotFoundException('Comment not found');

    if (comment.authorId !== userId && !['MODERATOR', 'ADMIN'].includes(userRole)) {
      throw new ForbiddenException('You can only delete your own comments');
    }

    return this.prisma.forumComment.delete({ where: { id } });
  }
}