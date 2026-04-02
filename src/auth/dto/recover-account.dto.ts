import { IsEmail, IsNotEmpty} from "class-validator";

export class RecoverDto {
    @IsNotEmpty({ message: 'Email is required' })
    @IsEmail({}, { message: 'Email must be a string value.' })
    email: string;
}