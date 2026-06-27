import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ForumService } from './forum.service';
import { ForumController } from './forum.controller';

@Module({
  imports: [JwtModule.register({})],
  providers: [ForumService],
  controllers: [ForumController],
})
export class ForumModule {}