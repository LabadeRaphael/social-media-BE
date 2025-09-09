import { IsEmail, IsNotEmpty, IsString, MinLength } from "class-validator";

export class ForgotPswDto {
    @IsNotEmpty({ message: 'Email is required' })
    @IsEmail({}, { message: 'Email must be a string value.' })
    email: string;
}