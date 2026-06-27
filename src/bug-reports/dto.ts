import { IsString, IsEnum, IsOptional, MinLength, MaxLength } from 'class-validator';

export enum BugPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export enum BugStatus {
  OPEN = 'OPEN',
  IN_PROGRESS = 'IN_PROGRESS',
  FIXED = 'FIXED',
  WONTFIX = 'WONTFIX',
  DUPLICATE = 'DUPLICATE',
}

export class CreateBugReportDto {
  @IsString()
  @MinLength(10)
  @MaxLength(200)
  title: string;

  @IsString()
  @MinLength(30)
  description: string;

  @IsEnum(BugPriority)
  @IsOptional()
  priority?: BugPriority;
}

export class UpdateBugStatusDto {
  @IsEnum(BugStatus)
  status: BugStatus;
}