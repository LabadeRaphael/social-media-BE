/* eslint-disable prettier/prettier */
import { Controller, Get, Post } from "@nestjs/common";

@Controller("users")
export class UsersController {
    @Post("/signup")
    createUser() {
        return "i can see signup"
    }
    @Get("/login")
    getUser() {
        return "i can see get"
    }

}
