/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-return */
// src/user/user.service.ts

import {ConflictException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UsersDto } from './users.dto';
import { handlePrismaError } from './../utils/prisma.error';
import * as bcrypt from 'bcrypt';
@Injectable()
export class UsersService {

  constructor(private readonly prisma: PrismaService) { }
  async create(user: UsersDto) {
    try {
      const hashedPassword = await bcrypt.hash(user.password, 10);
      const createUser = await this.prisma.user.create({
        data: {
          email: user.email,
          username: user.username,
          password: hashedPassword,
        }, select: {
          id: true,
          email: true,
          username: true,
        }
      });
      return createUser
    } catch (error: any) {
      handlePrismaError(error);
    }

  }
}