import { IsString, MinLength, MaxLength } from 'class-validator';

export class CreateTopicDto {
  @IsString()
  @MinLength(5)
  @MaxLength(200)
  title: string;

  @IsString()
  @MinLength(10)
  body: string;
}

export class CreateCommentDto {
  @IsString()
  @MinLength(2)
  body: string;
}