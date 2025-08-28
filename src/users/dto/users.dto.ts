import { IsEmail, IsString, IsNotEmpty, MinLength } from 'class-validator';

export class UsersDto {
  @IsString({ message: 'Email must be a string value.' })
  @IsEmail()
  email: string;

  @IsString({ message: 'User name must be a string value.' })
  @IsNotEmpty({ message: 'User name must not be empty.' })
  username: string;

  @IsString({ message: 'Password must be a string value.' })
  @IsNotEmpty({ message: 'Password must not be a empty.' })
  @MinLength(6, { message: 'Password must be at least 6 characters' })
  password: string;
}
