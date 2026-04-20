import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { sendWarningRecoverAccount } from 'src/utils/mailer';
import { AuthService } from './auth.service';
import { removeAllListeners } from 'process';

@Injectable()
export class TokenCleanupService {
  private readonly logger = new Logger(TokenCleanupService.name);

  constructor(
    private prisma: PrismaService,
    private authService: AuthService
  ) { }

  // Runs every midnight (you can change this interval)
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async cleanupExpiredResetTokens() {
    const result = await this.prisma.passwordResetToken.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });

    if (result.count > 0) {
      this.logger.log(`🧹 Deleted ${result.count} expired reset tokens.`);
    }
  }
  // 👇 NEW CRON JOB FOR ACCOUNT DELETION SYSTEM
  @Cron(CronExpression.EVERY_DAY_AT_10AM)
  async handleDeletedAccounts() {
    const users = await this.prisma.user.findMany({
      where: {
        isDeleted: true,
        deletionWarningSent: false,
        deletedAt: { not: null },
      },
      select: {
        id: true,
        email: true,
        userName: true,
        deletedAt: true,
        deletionWarningSent: true,
      },
    });
    console.log("the user", users);

    const now = Date.now();

    for (const user of users) {
      const deletedAt = new Date(user.deletedAt!);

      const diffInMs = now - deletedAt.getTime();
      const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

      const remainingDays = 30 - diffInDays;
      //tester
      // const remainingDays = 30 - 30;
      console.log("remaining days", remainingDays);

      // ⚠️ Send warning email when 1 day left
      if (remainingDays === 1 && !user.deletionWarningSent) {
        await this.authService.generateAndSendRecoverToken(user, {
          expiresIn: '24h',
          emailType: 'warning',
        })
        this.logger.log(`Warning email sent to ${user.email}`);
        const afterMsg = await this.prisma.user.update({
          where: { id: user.id },
          data: { deletionWarningSent: true },
        })
        console.log("after", afterMsg);


      }
      console.log("the user 2", users);

      // ❌ Auto delete after 30 days
      if (remainingDays <= 0) {
        await this.prisma.user.delete({
          where: { id: user.id },
        });

        this.logger.log(`Deleted account: ${user.email}`);
      }
    }
  }
}
