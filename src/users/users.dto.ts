/* eslint-disable prettier/prettier */
import { IsEmail, IsString, IsArray, IsOptional, IsNotEmpty } from 'class-validator';

export class UsersDto {
  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  
  username: string;

  @IsString()
  @IsNotEmpty()
  password: string;

  // @IsArray()
  // @IsString({ each: true })
  // @IsOptional()
  // posts?: string[];
}
