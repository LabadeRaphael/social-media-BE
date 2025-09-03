/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
// src/user/user.service.ts

import {
  ConflictException,
  forwardRef,
  Inject,
  Injectable,
  InternalServerErrorException
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UsersDto } from './dto/users.dto';
import { handlePrismaError } from './../utils/prisma.error';
import * as bcrypt from 'bcrypt';
import { LoginDto } from 'src/auth/dto/login.dto';
@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}
  async register(user: UsersDto) {
    try {
      const hashedPassword = await bcrypt.hash(user.password, 10);
      const createUser = await this.prisma.user.create({
        data: {
          email: user.email,
          username: user.userName,
          password: hashedPassword
        },
        select: {
          id: true,
          email: true,
          userName: true
        }
      });
      return createUser;
    } catch (error: any) {
      handlePrismaError(error);
    }
  }
  async login(login: LoginDto){
    const { email }  = login
    return this.prisma.user.findUnique({
      where: { email },
    });
  }
}
