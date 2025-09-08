import { IsEmail, IsNotEmpty, IsString, MinLength } from "class-validator";

export class ForgotPswDto {
    @IsNotEmpty({ message: 'Email is required' })
    @IsEmail({}, { message: 'Email must be a string value.' })
    email: string;

    // @IsString({ message: 'Password must be a string.' })
    // @IsNotEmpty({ message: 'Password must not be empty.' })
    // @MinLength(6, { message: 'Password must be at least 6 characters' })
    // password: string
}