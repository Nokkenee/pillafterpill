import { Controller, Get, Post, Delete, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ForumService } from './forum.service';
import { CreateTopicDto, CreateCommentDto } from './dto';
import { JwtGuard } from '../common/guards/jwt.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurrentUser } from '../common/decorators/user.decorator';

@ApiTags('Forum')
@ApiBearerAuth()
@UseGuards(JwtGuard, RolesGuard)
@Controller('forum')
export class ForumController {
  constructor(private forumService: ForumService) {}

  @Get('topics')
  getTopics(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    return this.forumService.getTopics({
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
      search,
    });
  }

  @Get('topics/:id')
  getTopic(@Param('id') id: string) {
    return this.forumService.getTopic(id);
  }

  @Post('topics')
  createTopic(
    @Body() dto: CreateTopicDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.forumService.createTopic(dto, userId);
  }

  @Post('topics/:id/comments')
  createComment(
    @Param('id') topicId: string,
    @Body() dto: CreateCommentDto,
    @CurrentUser('sub') userId: string,
  ) {
    return this.forumService.createComment(topicId, dto, userId);
  }

  @Delete('topics/:id')
  deleteTopic(
    @Param('id') id: string,
    @CurrentUser('sub') userId: string,
    @CurrentUser('role') role: string,
  ) {
    return this.forumService.deleteTopic(id, userId, role);
  }

  @Patch('topics/:id/lock')
  lockTopic(
    @Param('id') id: string,
    @CurrentUser('role') role: string,
  ) {
    return this.forumService.lockTopic(id, role);
  }

  @Patch('topics/:id/pin')
  pinTopic(
    @Param('id') id: string,
    @CurrentUser('role') role: string,
  ) {
    return this.forumService.pinTopic(id, role);
  }

  @Delete('comments/:id')
  deleteComment(
    @Param('id') id: string,
    @CurrentUser('sub') userId: string,
    @CurrentUser('role') role: string,
  ) {
    return this.forumService.deleteComment(id, userId, role);
  }
}