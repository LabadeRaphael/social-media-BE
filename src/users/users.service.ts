import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { handlePrismaError } from './../utils/prisma.error';
import { LoginDto } from 'src/auth/dto/login.dto';
import { ForgotPswDto } from 'src/auth/dto/forgot-psw.dto';
import { RegisterDto } from 'src/auth/dto/register.dto';
import * as bcrypt from 'bcrypt';

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
   const user = await this.prisma.user.findUnique({
      where: { email },
    });
    if (user?.isDeleted) {
      throw new ForbiddenException('Account has been deleted, kindly recover your it');
    }
    return user
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

  async findResetToken(userId: string) {
    console.log("userId", userId);

    return this.prisma.passwordResetToken.findFirst({
      where: { userId, used: false },
    });
  }


  async updatePassword(userId: string, hashedPassword: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });
  }
  async updateTokenState(userId: string) {
    return this.prisma.passwordResetToken.updateMany({
      where: { userId: userId },
      data: { used: true },
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
        blockedUsers: { select: { id: true } },
      },
    });
  }
  async blockUser(userId?: string, targetUserId?: string) {
    console.log("reach here");
    console.log("From block", userId, targetUserId);

    return this.prisma.user.update({
      where: { id: userId },
      data: {
        blockedUsers: {
          connect: { id: targetUserId },
        },
      },
    });

  }
  async unblockUser(userId?: string, blockedUserId?: string) {
    const isBlocked = await this.prisma.user.findFirst({
      where: { id: userId, blockedUsers: { some: { id: blockedUserId } } },
    });

    if (!isBlocked) {
      console.log("user not block");
      
      return { success: false, message: 'User was not blocked' };
    }

    return await this.prisma.user.update({
      where: { id: userId },
      data: {
        blockedUsers: {
          disconnect: { id: blockedUserId },
        },
      },
      select: {
        id: true,
        blockedUsers: { select: { id: true } },
      },

    });
  }
  async updateUser(
    userId: string,
    data: { userName?: string; password?: string;},
    avatarUrl?: string ,
  ) {
    const updateData: any = {};

    // Update username if provided
    if (data.userName) updateData.userName = data.userName;

    // Hash and update password if provided
    if (data.password) {
      const hashedPassword = await bcrypt.hash(data.password, 10);
      updateData.password = hashedPassword;
    }

    // Update avatar URL if uploaded
    if (avatarUrl) updateData.avatarUrl = avatarUrl;

    // Update the user in the database
    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: updateData,
      select:{
        id:true,
        userName: true,
        email:true,
        
      }
    });
    console.log("The update USER",updatedUser);

    return updatedUser;
  }
  
   async softDeleteUser(userId: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    console.log(user);
    
    if (!user) throw new ForbiddenException('User not found');

    const passwordMatches = await bcrypt.compare(password, user.password);
    if (!passwordMatches) throw new ForbiddenException('Incorrect password');

    // Soft delete
    const deleteAccount = await this.prisma.user.update({
      where: { id: userId },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
      },
      select:{
        id:true,
        userName: true,
        email:true,
        isDeleted:true
      }
      
    });
    console.log(deleteAccount);
    
    return deleteAccount


  }

}

