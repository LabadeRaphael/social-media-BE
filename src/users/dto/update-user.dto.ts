import { IsOptional, IsString, MinLength } from 'class-validator';
import { Transform } from 'class-transformer';

export class UpdateUserDto {
  @IsOptional()
  @IsString({ message: 'Username must be a string' })
  @Transform(({ value }) => String(value)?.trim())
  userName?: string;

  @IsOptional()
  @IsString({ message: 'Password must be a string' })
  @MinLength(6, { message: 'Password must be at least 6 characters' })
  @Transform(({ value }) => String(value)?.trim())
  password?: string;
}