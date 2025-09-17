import { UsersService } from './users.service';
import { Controller, Get, Query } from '@nestjs/common';

@Controller('users')
export class UsersController {
  constructor(private userService: UsersService) {}
 
  @Get('search')
 async getUserName( @Query('userName') userName: string ) {
    console.log(userName);
    userName.trim()
    return await this.userService.getUserByUsername(userName);
  //  console.log(user);
   
  }
}
