// auth/dto/reset-password.dto.ts
import { IsNotEmpty, IsString} from 'class-validator';

export class VerifyEmailChangeDto {

  @IsNotEmpty()
  @IsString()
  token: string;
}
