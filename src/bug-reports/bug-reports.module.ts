import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { BugReportsService } from './bug-reports.service';
import { BugReportsController } from './bug-reports.controller';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [JwtModule.register({}), NotificationsModule],
  providers: [BugReportsService],
  controllers: [BugReportsController],
})
export class BugReportsModule {}