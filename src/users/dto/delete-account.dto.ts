// delete-account.dto.ts
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class DeleteAccountDto {
    @IsString({ message: 'Password must be a string.' })
    @IsNotEmpty({ message: 'Password must not be empty.' })
    @MinLength(6, { message: 'Password must be at least 6 characters' })
    @Transform(({ value }) => String(value).trim())
    password: string;
}