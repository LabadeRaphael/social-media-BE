import { IsEmail, IsString, IsNotEmpty, MinLength, Matches, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';
export class RegisterDto {
  @IsNotEmpty({ message: 'Email is required' })
  @IsString({ message: 'Email must be a string value.' })
  @Transform(({ value }) => String(value).trim().toLowerCase())
  @IsEmail({}, { message: 'Email must be valid.' })
  email: string;

  @IsString({ message: 'Username must be a string value.' })
  @IsNotEmpty({ message: 'Username must not be empty.' })
  @Transform(({ value }) => String(value).trim().toLowerCase())
  @MinLength(3, { message: 'Username must be at least 3 characters.' })
  @MaxLength(20, { message: 'Username must not exceed 20 characters.' })
  @Matches(/^[a-zA-Z]+$/, {
    message: 'Username must contain only letters (a–z, A–Z).',
  })
  userName: string;

  @IsString({ message: 'Password must be a string value.' })
  @IsNotEmpty({ message: 'Password must not be a empty.' })
  @MinLength(6, { message: 'Password must be at least 6 characters' })
  @Transform(({ value }) => String(value).trim())
  password: string;
}
