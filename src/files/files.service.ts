import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as path from 'path';
import * as fs from 'fs';
import { v4 as uuid } from 'uuid';

const ALLOWED_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/gif',
  'image/webp',
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

@Injectable()
export class FilesService {
  constructor(private prisma: PrismaService) {}

  async uploadFile(
    reportId: string,
    file: Express.Multer.File,
    userId: string,
  ) {
    const report = await this.prisma.bugReport.findUnique({ where: { id: reportId } });
    if (!report) throw new NotFoundException('Bug report not found');

    if (file.size > MAX_FILE_SIZE) {
      throw new BadRequestException('File too large. Max 10MB');
    }

    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException('File type not allowed');
    }

    const ext = path.extname(file.originalname).toLowerCase();
    const storedName = `${uuid()}${ext}`;
    const uploadDir = path.join(process.cwd(), 'uploads');

    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const filePath = path.join(uploadDir, storedName);
    fs.writeFileSync(filePath, file.buffer);

    return this.prisma.bugFile.create({
      data: {
        filename: file.originalname,
        storedName,
        fileUrl: `/uploads/${storedName}`,
        fileType: file.mimetype,
        fileSize: file.size,
        reportId,
      },
    });
  }

  async getFiles(reportId: string) {
    return this.prisma.bugFile.findMany({ where: { reportId } });
  }

  async deleteFile(fileId: string, userId: string, userRole: string) {
    const file = await this.prisma.bugFile.findUnique({
      where: { id: fileId },
      include: { report: true },
    });

    if (!file) throw new NotFoundException('File not found');

    if (file.report.authorId !== userId && !['MODERATOR', 'ADMIN'].includes(userRole)) {
      throw new BadRequestException('You can only delete your own files');
    }

    const filePath = path.join(process.cwd(), 'uploads', file.storedName);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    return this.prisma.bugFile.delete({ where: { id: fileId } });
  }
}