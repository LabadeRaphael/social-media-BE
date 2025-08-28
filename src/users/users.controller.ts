import { UsersService } from './users.service';
import { UsersDto } from './dto/users.dto';
import { Controller, Get, Body, ValidationPipe } from '@nestjs/common';

@Controller('users')
export class UsersController {
  constructor(private userService: UsersService) {}
  @Get()
  createUser(@Body(new ValidationPipe()) user: UsersDto) {
    return this.userService.register(user);
  }
  @Get(':email')
  getUser() {
    return 'i can see get';
  }
}
