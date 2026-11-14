import { Module } from "@nestjs/common";
import { ReauthenticationService } from "./reauthentication.service";
import { PrismaModule } from "src/prisma/prisma.module";

@Module({
  providers: [
    ReauthenticationService,
  ],
  exports: [
    ReauthenticationService
  ],
  imports:[
    PrismaModule
  ]
})
export class ReauthenticationModule {}