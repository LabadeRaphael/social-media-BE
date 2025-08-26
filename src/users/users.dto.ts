/* eslint-disable prettier/prettier */
import { IsEmail, IsString, IsArray, IsOptional, IsNotEmpty } from 'class-validator';

export class UsersDto {
  @IsString({ message:"Email must be a string value." })
  @IsEmail()
  email: string;

  @IsString({ message:"User name must be a string value." })
  @IsNotEmpty({ message:"User name must not be empty." })
  username: string;

  @IsString({ message:"Password must be a string value." })
  @IsNotEmpty({ message:"Password must not be a empty." })
  password: string;

  // @IsArray()
  // @IsString({ each: true })
  // @IsOptional()
  // posts?: string[];
}
