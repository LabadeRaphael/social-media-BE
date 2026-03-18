import { ForbiddenException, Injectable, UnauthorizedException } from "@nestjs/common";
import * as bcrypt from 'bcrypt';
import { User } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import * as ms from 'ms';
@Injectable()
export class AuthHelper {
  constructor(private prisma: PrismaService) { }

  // Class method is private and async — works fine
  async verifyPasswordOrThrow(user: User, password: string) {
    const MAX_ATTEMPTS = 3;
    
    const attempts = user.failedAuthAttempts + 1
    console.log(attempts);
    const LOCK_TIME = 1000 * 60 * 1; // 30 minutes
    const remainingAttempts = MAX_ATTEMPTS - attempts;
  
    if (user.authLockedUntil && user.authLockedUntil > new Date()) {
        const remainingTime = user?.authLockedUntil?.getTime() - Date.now();
      const timeLeft = ms(remainingTime, { long: true });

      throw new ForbiddenException(
        `Account is temporarily locked. Try again after. ${timeLeft}`
      );
    }

    const isValid = await bcrypt.compare(password, user.password);

    if (!isValid) {
      const attempts = user.failedAuthAttempts + 1;

      if (attempts >= MAX_ATTEMPTS) {
        await this.prisma.user.update({
          where: { id: user.id },
          data: {
            failedAuthAttempts: 0,
            authLockedUntil: new Date(Date.now() + LOCK_TIME),
          },
        });
        return { status: false, locked: true, message: 'Too many attempts. Account locked.' };
        // throw new ForbiddenException('Too many attempts. Account locked.');
      }

      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          failedAuthAttempts: attempts,
        },
      });
       return { status: false, locked: false, remainingAttempts };
      // throw new UnauthorizedException(
      //   `Incorrect password. You have used ${attempts}/${MAX_ATTEMPTS} attempts`
      // );
      // throw new UnauthorizedException(
      //   `Incorrect password. You have ${remainingAttempts} attempt(s) left`
      // );
    }

    // Reset attempts on successful authentication
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        failedAuthAttempts: 0,
        authLockedUntil: null,
      },
    });
    return { status: true };
  }
}