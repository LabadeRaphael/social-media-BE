import { Transform } from 'class-transformer';
import { IsEmail, IsString, IsNotEmpty, MinLength } from 'class-validator';

export class LoginDto {
  @IsNotEmpty({ message: 'Email is required' })
  @IsString({ message: 'Email must be a string value.' })
  @IsEmail({}, { message: 'Email must be valid.' })
  @Transform(({ value }) => String(value).trim().toLowerCase())
  email: string;

  @IsString({ message: 'Password must be a string.' })
  @IsNotEmpty({ message: 'Password must not be empty.' })
  @MinLength(6, { message: 'Password must be at least 6 characters' })
  @MinLength(6, { message: 'Password must be at least 6 characters' })
  @Transform(({ value }) => String(value).trim())
  password: string;
}
