import {
  Injectable,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UsersDto } from './dto/users.dto';
import { handlePrismaError } from './../utils/prisma.error';
import * as bcrypt from 'bcrypt';
import { LoginDto } from 'src/auth/dto/login.dto';
import { ForgotPswDto } from 'src/auth/dto/forgot-psw.dto';
import { LogoutDto } from 'src/auth/dto/logout.dto';
@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
  ) { }
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
        return { message: 'Signup failed', status: false }
      }

      return { message: 'Signup successful', status: true };
    } catch (error: any) {
      handlePrismaError(error);
    }
  }
  async login(login: LoginDto) {
    const { email } = login
    return this.prisma.user.findUnique({
      where: { email },
    });
  }
  async saveRefreshToken(userId: string, token: string, expiresAt: Date){
     return this.prisma.refreshToken.create({
      data: {
        userId,
        token,
        expiresAt
      },
    });
  }
  async findByEmail(forgotPsw: ForgotPswDto) {
    const { email } = forgotPsw
    return this.prisma.user.findUnique({
      where: { email },
    });
  }
  async updatePassword(userId: string, newPassword: string) {

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    return this.prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

  }
  async findById(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
    });

  }
  async deleteAllRefreshTokens(userId: string) {
    return this.prisma.refreshToken.deleteMany({
      where: { userId },
    });
  }
  async logout(logout:LogoutDto) {
    const { refreshToken } = logout
    const token = await this.prisma.refreshToken.findUnique({
      where: { token: refreshToken },
    });
    if (token) {
      await this.prisma.refreshToken.delete({
        where: { id: token.id },
      });
      
    }
    
  }
  async validateRefreshToken(userId: string, token: string) {
  const stored = await this.prisma.refreshToken.findFirst({
    where: { userId, token },
  });

  return stored;
}

  async deleteRefreshToken(refreshToken: string) {
  await this.prisma.refreshToken.delete({
    where: {
      token: refreshToken,
    },
  });
}
}
