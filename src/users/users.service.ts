// // import { User } from './../../generated/prisma/index.d';
// // import { User } from 'generated/prisma';
// import {
//   Injectable,
// } from '@nestjs/common';
// import { PrismaService } from '../prisma/prisma.service';
// import { UsersDto } from './dto/users.dto';
// import { handlePrismaError } from './../utils/prisma.error';
// import * as bcrypt from 'bcrypt';
// import { LoginDto } from 'src/auth/dto/login.dto';
// import { ForgotPswDto } from 'src/auth/dto/forgot-psw.dto';
// import { LogoutDto } from 'src/auth/dto/logout.dto';
// @Injectable()
// export class UsersService {
//   constructor(
//     private readonly prisma: PrismaService,
//   ) { }
//   async register(user: UsersDto) {
//     try {
//       const hashedPassword = await bcrypt.hash(user.password, 10);
//       // const existingUser = await this.prisma.findByEmail(user.email);
//       const createUser = await this.prisma.user.create({
//         data: {
//           email: user.email,
//           userName: user.userName,
//           password: hashedPassword
//         },
//         select: {
//           id: true,
//           email: true,
//           userName: true
//         }
//       });
//       if (!createUser) {
//         return { message: 'Signup failed', status: false }
//       }

//       return { message: 'Signup successful', status: true };
//     } catch (error: any) {
//       handlePrismaError(error);
//     }
//   }
//   async login(login: LoginDto) {
//     const { email } = login
//     return this.prisma.user.findUnique({
//       where: { email },
//     });
//   }
//   async saveRefreshToken(userId: string, token: string, expiresAt: Date){
//     try {
//       // Validate inputs
//     if (!userId || !token || !expiresAt) {
//       throw new Error('Invalid input: userId, token, and expiresAt are required');
//     }
//     const user = await this.prisma.user.findUnique({ where: { id: userId } });
//     if (!user) {
//       throw new Error(`User with ID ${userId} not found`);
//     }

//     const saved = await this.prisma.refreshToken.create({
//       data: { userId, token, expiresAt },
//     });
//     console.log("Saved refresh token:", saved);
//     return saved;
//   } catch (error) {
//     console.error("Failed to save refresh token:", error); // fix typo "messsage"
//     throw error; // let it bubble up
//   }
//   }
//   async findByEmail(forgotPsw: ForgotPswDto) {
//     const { email } = forgotPsw
//     return this.prisma.user.findUnique({
//       where: { email },
//     });
//   }
//   async updatePassword(userId: string, newPassword: string) {

//     const hashedPassword = await bcrypt.hash(newPassword, 10);
//     return this.prisma.user.update({
//       where: { id: userId },
//       data: { password: hashedPassword },
//     });

//   }
//   async findById(userId: string) {
//     return this.prisma.user.findUnique({
//       where: { id: userId },
//     });

//   }
//   async deleteAllRefreshTokens(userId: string) {
//     return this.prisma.refreshToken.deleteMany({
//       where: { userId },
//     });
//   }
//   async logout(logout:LogoutDto) {
//     const { refreshToken } = logout
//     const token = await this.prisma.refreshToken.findFirst({
//       where: { token: refreshToken },
//     });
//     if (token) {
//       await this.prisma.refreshToken.delete({
//         where: { id: token.id },
//       });

//     }

//   }
//   async validateRefreshToken(refreshToken: string) {
//   return this.prisma.refreshToken.findFirst({
//     where: { token: refreshToken },
//   });

// }

//   async deleteRefreshToken(refreshToken: string) {
//   await this.prisma.refreshToken.deleteMany({
//     where: {
//       token: refreshToken,
//     },
//   });
// }
// }

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UsersDto } from './dto/users.dto';
import { handlePrismaError } from './../utils/prisma.error';
import { LoginDto } from 'src/auth/dto/login.dto';
import { ForgotPswDto } from 'src/auth/dto/forgot-psw.dto';
import { LogoutDto } from 'src/auth/dto/logout.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) { }

  async register(user: UsersDto, hashedPassword: string) {

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

    // if (!createUser) {
    //   return { message: 'Signup failed', status: false };
    // }

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

  async updatePassword(userId: string, hashedPassword: string) {
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

  async logout(logout: LogoutDto) {
    const { refreshToken } = logout;
    const token = await this.prisma.refreshToken.findFirst({
      where: { token: refreshToken },
    });
    if (token) {
      await this.prisma.refreshToken.delete({
        where: { id: token.id },
      });
    }
  }

  async validateRefreshToken(refreshToken: string) {
    return this.prisma.refreshToken.findFirst({
      where: { token: refreshToken },
    });
  }

  async deleteRefreshToken(refreshToken: string) {
    await this.prisma.refreshToken.deleteMany({
      where: {
        token: refreshToken,
      },
    });
  }


  async getUserByUsername(userName: string) {
    return this.prisma.user.findMany({
      where: {
        userName:{
          contains: userName,
          mode: 'insensitive',
        }
      },select:{
        id: true,
        email: true,
        userName: true,
      },
    });
  }
}

