// import { Injectable, UnauthorizedException } from "@nestjs/common";
// import { createHash, randomBytes } from "crypto";
// import { UsersService } from "src/users/users.service";

// @Injectable()
// export class ReauthenticationService {
//     constructor(
//         private readonly usersService: UsersService,
//     ) { }

//     async generateReauthenticationProof(
//         userId: string,
//         intent: string,
//     ) {
//         // 1. Generate a cryptographically random token.
//         const token = randomBytes(32).toString('hex');

//         // 2. Hash the token before storing it.
//         const tokenHash = createHash('sha256')
//             .update(token)
//             .digest('hex');

//         // 3. Set a five-minute expiry.
//         const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

//         // 4. Store only the hash.
//         await this.usersService.createReauthenticationProof(
//             userId,
//             intent,
//             tokenHash,
//             expiresAt,
//         );

//         // 5. Return the original token for the HTTP-only cookie.
//         return token;
//     }

//     async verifyReauthenticationProof(
//         userId: string,
//         intent: string,
//         token: string,
//     ) {
//         const tokenHash = createHash('sha256')
//             .update(token)
//             .digest('hex');

//         const isValid =
//             await this.usersService.consumeReauthenticationProof(
//                 userId,
//                 intent,
//                 tokenHash,
//             );

//         if (!isValid) {
//             throw new UnauthorizedException(
//                 'Your Google verification has expired or is invalid. Please verify again.',
//             );
//         }
//     }
// }


import { Injectable, UnauthorizedException } from "@nestjs/common";
import { createHash, randomBytes } from "crypto";
import { PrismaService } from "src/prisma/prisma.service";

@Injectable()
export class ReauthenticationService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async generateReauthenticationProof(
    userId: string,
    intent: string,
  ) {
    // 1. Generate a cryptographically random token.
    const token = randomBytes(32).toString("hex");

    // 2. Hash the token before storing it.
    const tokenHash = createHash("sha256")
      .update(token)
      .digest("hex");

    // 3. Set a five-minute expiry.
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    // 4. Store only the hash.
    await this.prisma.reauthenticationProof.create({
      data: {
        userId,
        intent,
        tokenHash,
        expiresAt,
      },
    });
    // console.log("reauth reach", token);
    
    // 5. Return the original token for the HTTP-only cookie.
    return token;
  }

  async verifyReauthenticationProof(
    userId: string,
    intent: string,
    token: string,
  ) {
    const tokenHash = createHash("sha256")
      .update(token)
      .digest("hex");

    // Atomically consume the proof.
    const result = await this.prisma.reauthenticationProof.updateMany({
      where: {
        userId,
        intent,
        tokenHash,
        usedAt: null,
        expiresAt: {
          gt: new Date(),
        },
      },
      data: {
        usedAt: new Date(),
      },
    });

    if (result.count !== 1) {
      throw new UnauthorizedException(
        "Your Google verification has expired or is invalid. Please verify again.",
      );
    }
  }
}
