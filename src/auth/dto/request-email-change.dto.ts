// dto/request-email-change.dto.ts
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class RequestEmailChangeDto {
  @IsEmail()
  newEmail: string;
  
  @IsNotEmpty()
  @IsString()
  emailAuthPassword:string
}