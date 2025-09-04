import { User } from './../../generated/prisma/index.d';

import {
  Injectable,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UsersDto } from './dto/users.dto';
import { handlePrismaError } from './../utils/prisma.error';
import * as bcrypt from 'bcrypt';
import { LoginDto } from 'src/auth/dto/login.dto';
import { ForgotPswDto } from 'src/auth/dto/forgot-psw.dto';
import { ResetPasswordDto } from 'src/auth/dto/reset-psw.dto';
@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}
  async register(user: UsersDto) {
    try {
      const hashedPassword = await bcrypt.hash(user.password, 10);
      // const existingUser = await this.prisma.findByEmail(user.email);
      const createUser = await this.prisma.user.create({
        data: {
          email: user.email,
          userName: user.userName,
          password: hashedPassword
        },
        select: {
          id: true,
          email: true,
          userName: true
        }
      });
      if (!createUser) {
        return {message: 'Signup failed', status:false}
      }

      return {message: 'Signup successful', status:true};
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
  async findByEmail(forgotPsw: ForgotPswDto){
    const { email }= forgotPsw
    return this.prisma.user.findUnique({
      where: { email },
    });
  }
  async updatePassword(resetPsw: ResetPasswordDto) {
    const { email, newPassword } = resetPsw
    // newPassword=has
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    return this.prisma.user.update({
      where: { email },
      data: { password: hashedPassword },
    });
  }
}
