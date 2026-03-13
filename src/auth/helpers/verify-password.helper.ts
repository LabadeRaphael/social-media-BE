import { ForbiddenException, UnauthorizedException } from "@nestjs/common";
import * as bcrypt from 'bcrypt';
import { User } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
export class AuthHelper {
  constructor(private prisma: PrismaService) {}

  // Class method is private and async — works fine
  private async verifyPasswordOrThrow(user: User, password: string) {
    const MAX_ATTEMPTS = 3;
    const LOCK_TIME = 1000 * 60 * 30; // 30 minutes

    if (user.authLockedUntil && user.authLockedUntil > new Date()) {
      throw new ForbiddenException(
        'Account is temporarily locked. Try again later.'
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

        throw new ForbiddenException('Too many attempts. Account locked.');
      }

      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          failedAuthAttempts: attempts,
        },
      });

      throw new UnauthorizedException('Incorrect password');
    }

    // Reset attempts on successful authentication
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        failedAuthAttempts: 0,
        authLockedUntil: null,
      },
    });
  }
}