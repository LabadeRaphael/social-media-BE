import { IsEmail, IsString, IsNotEmpty, MinLength } from 'class-validator';

export class LoginDto {
  @IsEmail({}, { message: 'Email must be valid.' })
  email: string;

  @IsString({ message: 'Password must be a string.' })
  @IsNotEmpty({ message: 'Password must not be empty.' })
  @MinLength(6, { message: 'Password must be at least 6 characters' })
  password: string;
}
