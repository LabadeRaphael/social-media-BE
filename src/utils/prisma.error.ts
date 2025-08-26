import { log } from 'node:console';
/* eslint-disable prettier/prettier */
import { ConflictException, InternalServerErrorException, RequestTimeoutException } from '@nestjs/common';

export const handlePrismaError = (error: any): never => {
    if(error?.code==='EADDRINUSE'){
     throw new RequestTimeoutException("Database response timed out. Please try again later")
    }
  if (error?.code === 'P2002') {
    const field = error.meta?.target?.[0] ?? 'field';
    console.log(`${field} already exists`);
    throw new ConflictException(`${field} already exists`);
    
  }

  console.error('Unhandled Prisma Error:', error);

  throw new InternalServerErrorException('Something went wrong');
};
