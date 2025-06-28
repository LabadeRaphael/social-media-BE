/* eslint-disable prettier/prettier */
// src/prisma/prisma.module.ts

import { Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Module({
  providers: [PrismaService],
  exports: [PrismaService], // Makes PrismaService available to other modules
})
export class PrismaModule {}
