// dto/request-email-change.dto.ts
import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class RequestEmailChangeDto {
  @IsEmail()
  newEmail!: string;
  
  @IsNotEmpty()
  @IsOptional()
  @IsString()
  emailAuthPassword?:string
}