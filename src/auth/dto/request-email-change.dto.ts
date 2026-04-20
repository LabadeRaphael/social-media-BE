// dto/request-email-change.dto.ts
import { IsEmail } from 'class-validator';

export class RequestEmailChangeDto {
  @IsEmail()
  newEmail: string;
}