import { Body, Injectable } from '@nestjs/common';
import { UsersService } from './../users/users.service';
import { UsersDto } from 'src/users/dto/users.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
@Injectable()
export class AuthService {
  constructor(private readonly usersService: UsersService) {}
  async register(user: RegisterDto) {
    return await this.usersService.register(user);
  }
  async login(login: LoginDto) {
    return await this.usersService.login(login);
  }
}
