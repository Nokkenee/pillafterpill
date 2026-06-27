import { Controller, Get, Patch, Body, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtGuard } from '../common/guards/jwt.guard';
import { CurrentUser } from '../common/decorators/user.decorator';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtGuard)
@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get('me')
  getMe(@CurrentUser('sub') userId: string) {
    return this.usersService.getMe(userId);
  }

  @Get('me/bug-reports')
  getMyBugReports(@CurrentUser('sub') userId: string) {
    return this.usersService.getUserBugReports(userId);
  }

  @Get('me/topics')
  getMyTopics(@CurrentUser('sub') userId: string) {
    return this.usersService.getUserTopics(userId);
  }

  @Patch('me/password')
  changePassword(
    @CurrentUser('sub') userId: string,
    @Body() dto: { oldPassword: string; newPassword: string },
  ) {
    return this.usersService.changePassword(userId, dto.oldPassword, dto.newPassword);
  }

  @Get(':id')
  getById(@Param('id') id: string) {
    return this.usersService.getById(id);
  }

  @Get(':id/bug-reports')
  getUserBugReports(@Param('id') id: string) {
    return this.usersService.getUserBugReports(id);
  }
}