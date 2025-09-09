// auth/dto/reset-password.dto.ts
import { IsNotEmpty, MinLength, IsString} from 'class-validator';

export class ResetPasswordDto {

  @IsNotEmpty()
  @IsString()
  token: string;
  
  @IsNotEmpty()
  @IsString()
  @MinLength(6, { message: 'Password must be at least 6 characters' })
  newPassword: string;
  
  @IsNotEmpty()
  @IsString()
  @MinLength(6, { message: 'Confirm Password must be at least 6 characters' })
  confirmPassword: string;
}
