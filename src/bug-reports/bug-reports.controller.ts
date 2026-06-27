import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { BugReportsService } from './bug-reports.service';
import { CreateBugReportDto, UpdateBugStatusDto } from './dto';
import { JwtGuard } from '../common/guards/jwt.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurrentUser } from '../common/decorators/user.decorator';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('Bug Reports')
@ApiBearerAuth()
@UseGuards(JwtGuard, RolesGuard)
@Controller('bug-reports')
export class BugReportsController {
  constructor(private bugReportsService: BugReportsService) {}

  @Get()
  findAll(
    @Query('archived') archived?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('priority') priority?: string,
  ) {
    return this.bugReportsService.findAll({
      archived: archived === 'true',
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
      search,
      status,
      priority,
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.bugReportsService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateBugReportDto, @CurrentUser('sub') userId: string) {
    return this.bugReportsService.create(dto, userId);
  }

  @Patch(':id/status')
  @Roles('DEVELOPER', 'MODERATOR', 'ADMIN')
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateBugStatusDto,
    @CurrentUser('role') role: string,
  ) {
    return this.bugReportsService.updateStatus(id, dto, role);
  }

  @Patch(':id/archive')
  @Roles('MODERATOR', 'ADMIN')
  archive(@Param('id') id: string, @CurrentUser('role') role: string) {
    return this.bugReportsService.archive(id, role);
  }

  @Delete(':id')
  delete(
    @Param('id') id: string,
    @CurrentUser('sub') userId: string,
    @CurrentUser('role') role: string,
  ) {
    return this.bugReportsService.delete(id, userId, role);
  }

  @Post(':id/comments')
  addComment(
    @Param('id') id: string,
    @Body() dto: { body: string; parentId?: string },
    @CurrentUser('sub') userId: string,
  ) {
    return this.bugReportsService.addComment(id, dto.body, userId, dto.parentId);
  }

  @Delete('comments/:commentId')
  deleteComment(
    @Param('commentId') commentId: string,
    @CurrentUser('sub') userId: string,
    @CurrentUser('role') role: string,
  ) {
    return this.bugReportsService.deleteComment(commentId, userId, role);
  }

}