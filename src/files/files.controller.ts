import { Controller, Post, Get, Delete, Param, UseGuards, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiTags, ApiConsumes } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { memoryStorage } from 'multer';
import { FilesService } from './files.service';
import { JwtGuard } from '../common/guards/jwt.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurrentUser } from '../common/decorators/user.decorator';

@ApiTags('Files')
@ApiBearerAuth()
@UseGuards(JwtGuard, RolesGuard)
@Controller('bug-reports/:reportId/files')
export class FilesController {
  constructor(private filesService: FilesService) {}

  @Post()
  @Throttle({ default: { limit: 10, ttl: 3600000 } })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  upload(
    @Param('reportId') reportId: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser('sub') userId: string,
  ) {
    return this.filesService.uploadFile(reportId, file, userId);
  }

  @Get()
  getFiles(@Param('reportId') reportId: string) {
    return this.filesService.getFiles(reportId);
  }

  @Delete(':fileId')
  deleteFile(
    @Param('fileId') fileId: string,
    @CurrentUser('sub') userId: string,
    @CurrentUser('role') role: string,
  ) {
    return this.filesService.deleteFile(fileId, userId, role);
  }
}