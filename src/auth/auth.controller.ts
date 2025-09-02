import { Body, Controller, Post, ValidationPipe } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UsersDto } from 'src/users/dto/users.dto';
import { LoginDto } from './dto/login.dto';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService
    // private readonly userService: UsersService
  ) {}
  
  @Post('signup')
  createUser(@Body(new ValidationPipe()) user: UsersDto) {
    return this.authService.register(user);
  }
  @Post('login')
  async login(@Body(new ValidationPipe()) login: LoginDto) {
    return await this.authService.login(login);
  }
}
