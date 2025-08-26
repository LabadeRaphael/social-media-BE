import { UsersService } from './users.service';
import { UsersDto } from './users.dto';
/* eslint-disable prettier/prettier */
import { Controller, Get, Post, Body, ValidationPipe } from "@nestjs/common";

@Controller("users")
export class UsersController {
    constructor(private userService:UsersService){}
    @Post("/signup")
    createUser(@Body(new ValidationPipe()) user: UsersDto) {
        return this.userService.create(user)
    }
    @Get("/login")
    getUser() {
        return "i can see get"
    }
    // @Get(":id")
    // getUserById(@Param){
    //     return "i can see get by id"
    // }

}
