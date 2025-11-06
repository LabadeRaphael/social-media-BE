import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { handlePrismaError } from './../utils/prisma.error';
import { LoginDto } from 'src/auth/dto/login.dto';
import { ForgotPswDto } from 'src/auth/dto/forgot-psw.dto';
import { RegisterDto } from 'src/auth/dto/register.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) { }

  async register(user: RegisterDto, hashedPassword: string) {

    return this.prisma.user.create({
      data: {
        email: user.email,
        userName: user.userName,
        password: hashedPassword,
      },
      select: {
        id: true,
        email: true,
        userName: true,
      },
    });
  }


  async login(login: LoginDto) {
    const { email } = login;
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  async saveRefreshToken(userId: string, token: string, expiresAt: Date) {
    try {
      if (!userId || !token || !expiresAt) {
        throw new Error('Invalid input: userId, token, and expiresAt are required');
      }

      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      console.log("prisma user", user);

      if (!user) {
        throw new Error(`User with ID ${userId} not found`);
      }

      const saved = await this.prisma.refreshToken.create({
        data: { userId, token, expiresAt },
      });
      console.log('Saved refresh token:', saved);
      return saved;
    } catch (error) {
      console.error('Failed to save refresh token:', error);
      handlePrismaError(error);
      throw error;
    }
  }

  async findByEmail(forgotPsw: ForgotPswDto) {
    const { email } = forgotPsw;
    return this.prisma.user.findUnique({
      where: { email },
    });
  }
  async saveResetPswToken(userId: string, hashedPswToken: string, expiresAt: Date) {
     return this.prisma.passwordResetToken.create({
      data: {
        hashedPswToken,
        userId,
        expiresAt
       }, 
    });
  }

async findResetToken(userId:string) {
  console.log("userId",userId);
  
  return this.prisma.passwordResetToken.findFirst({
    where: { userId, used:false },
  });
}


  async updatePassword(userId: string, hashedPassword: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword},
    });
  }
  async updateTokenState( userId:string ) {
    return this.prisma.passwordResetToken.updateMany({
      where: {userId:userId},
      data: { used: true},
    });
  }

  async findById(userId?: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
    });
  }

  async deleteAllRefreshTokens(userId: string) {
    return this.prisma.refreshToken.deleteMany({
      where: { userId },
    });
  }

  async logout(refreshToken: string) {

    const token = await this.prisma.refreshToken.findFirst({
      where: { token: refreshToken },
    });
    if (token) {
      await this.prisma.refreshToken.delete({
        where: { id: token.id },
      });
    }
  }

  async validateRefreshToken(oldRefreshToken: string) {
    return this.prisma.refreshToken.findFirst({
      where: { token: oldRefreshToken },
    });
  }

  async deleteRefreshToken(oldRefreshToken: string) {
    await this.prisma.refreshToken.deleteMany({
      where: {
        token: oldRefreshToken,
      },
    });
  }


  async getUserByUsername(normalized: string, currentUserId: string) {
    return this.prisma.user.findMany({
      where: {
        userName: {
          contains: normalized,
          mode: 'insensitive',
        }, id: {
          not: currentUserId, // exclude the logged-in user
        },
      }, select: {
        id: true,
        email: true,
        userName: true,
      },
    });
  }
  async getUserProfile(userId?: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        userName: true,
      },
    });
  }
}

