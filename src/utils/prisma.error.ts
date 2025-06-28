import { ConflictException, InternalServerErrorException } from '@nestjs/common';

export const handlePrismaError = (error: any): never => {
  if (error?.code === 'P2002') {
    throw new ConflictException('Email or Username already exists');
  }

  console.error('Unhandled Prisma Error:', error);

  throw new InternalServerErrorException('Something went wrong');
};
