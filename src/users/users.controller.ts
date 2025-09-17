import { UsersService } from './users.service';
import { Controller, Get, Query } from '@nestjs/common';

@Controller('users')
export class UsersController {
  constructor(private userService: UsersService) {}
 
  @Get('search')
 async getUserName( @Query('userName') userName: string ) {
    const normalized = userName.trim().toLowerCase(); // controller-level
    return await this.userService.getUserByUsername(normalized);
  //  console.log(user);
   
  }
}
