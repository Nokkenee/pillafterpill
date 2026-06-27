import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { FilesService } from './files.service';
import { FilesController } from './files.controller';

@Module({
  imports: [JwtModule.register({})],
  providers: [FilesService],
  controllers: [FilesController],
})
export class FilesModule {}