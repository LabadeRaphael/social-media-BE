import { ForbiddenException, Injectable, UnauthorizedException } from "@nestjs/common";
import * as bcrypt from 'bcrypt';
import { User } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import * as ms from 'ms';
@Injectable()
export class AuthHelper {
  constructor(private prisma: PrismaService) { }

  // Class method is private and async — works fine
  async verifyPasswordOrThrow(userId: string, password: string) {
    console.log("🔥 VERIFY CALLED");
    const MAX_ATTEMPTS = 3;
    const LOCK_TIME = 1000 * 60 * 1; // 15 minutes
    console.log("user2", userId);
    const freshUser = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (freshUser?.isDeleted) {
      const now = new Date();

      if (!freshUser.deletedAt) {
        throw new ForbiddenException("Invalid account state.");
      }
      const MS_PER_DAY = 1000 * 60 * 60 * 24;

      // const deletedAt = new Date(Date.now() - 29 * MS_PER_DAY);
      const deletedAt = new Date(freshUser.deletedAt);
      const diffInMs = now.getTime() - deletedAt.getTime();
      const diffInDays = Math.floor(diffInMs / MS_PER_DAY);

      const remainingDays = Math.max(0, 30 - diffInDays);
      if (remainingDays <= 0) {
        throw new ForbiddenException(
          "Your account has been permanently deleted. Kindly sign up"
        );
      }
      throw new ForbiddenException(
        `Account has been temporarily disabled. You can restore it within ${remainingDays} day${remainingDays === 1 ? "" : "s"
        }.`
      );
    }
    if (!freshUser) {
      throw new UnauthorizedException('User not found');
    }
    console.log("freshUser", freshUser);
    if (freshUser.authLockedUntil && freshUser.authLockedUntil > new Date()) {
      console.log("i get here");
      const remainingTime = freshUser?.authLockedUntil?.getTime() - Date.now();
      const timeLeft = ms(remainingTime, { long: true });

      // throw new ForbiddenException(
      //   `Account is temporarily locked. Try again after. ${timeLeft}`
      // );
      throw new ForbiddenException({
        message: `Account is temporarily locked`,
        timeLeft: remainingTime,
        readableTime: timeLeft,
      });
    }
    const isValid = await bcrypt.compare(password, freshUser.password);

    if (!isValid) {
      const latestUser = await this.prisma.user.findUnique({ where: { id: userId } });
      console.log("laes", latestUser);

      const attempts = (latestUser?.failedAuthAttempts || 0) + 1;
      const remainingAttempts = MAX_ATTEMPTS - attempts;

      // const attempts = freshUser.failedAuthAttempts + 1
      // const remainingAttempts = MAX_ATTEMPTS - attempts;
      console.log("attempts", attempts, remainingAttempts);

      if (attempts >= MAX_ATTEMPTS) {
        console.log("is i")

        await this.prisma.user.update({
          where: { id: userId },
          data: {
            failedAuthAttempts: 0,
            authLockedUntil: new Date(Date.now() + LOCK_TIME),
          },
        });

        throw new ForbiddenException(`Too many attempts. Retry  after 1 minute.`);
      }

      const updatedUser = await this.prisma.user.update({
        where: { id: userId },
        data: {
          failedAuthAttempts: attempts,
          authLockedUntil: null,
        },
      });

      // ✅ use this from now on
      console.log("upde user", updatedUser);
      throw new UnauthorizedException(
        `Incorrect password. You have ${remainingAttempts} attempt(s) left`
      );

    }
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        failedAuthAttempts: 0,
        authLockedUntil: null,
      },
    });
  }

}