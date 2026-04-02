// auth/dto/reset-password.dto.ts
import { IsNotEmpty, IsString} from 'class-validator';

export class VerifyActDto {

  @IsNotEmpty()
  @IsString()
  token: string;
}
