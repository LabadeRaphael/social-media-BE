/* eslint-disable prettier/prettier */
import {
  BadRequestException,
  ConflictException,
  InternalServerErrorException,
  NotFoundException,
  RequestTimeoutException,
  ServiceUnavailableException
} from '@nestjs/common';
function prettifyFieldName(str: string): string {
  if (!str) return str;

  // Insert spaces before capital letters and trim
  const withSpaces = str.replace(/([A-Z])/g, ' $1').trim();

  // Capitalize first letter
  return withSpaces.charAt(0).toUpperCase() + withSpaces.slice(1);
}

export const handlePrismaError = (error: any): never => {
  if (error?.code === 'EADDRINUSE') {
    throw new RequestTimeoutException(
      'Database response timed out. Please try again later'
    );
  }
  if (error?.code === 'P2002') {
    const rawField = error.meta?.target?.[0] ?? 'field';
    const field = prettifyFieldName(rawField);;
    console.log(`${field} already exists`);
    throw new ConflictException(`${field} already exists`);
  }
   if (error.code === 'P1001') {
    throw new ServiceUnavailableException('Database connection failed. Please try again later.');
  }
  if(error.code === 'P2025'){
    throw new NotFoundException('Record not found');
  }
  if(error.code === 'P2003'){
    throw new BadRequestException('Invalid reference to related record');
  }

  console.error('Unhandled Prisma Error:', error);

  throw new InternalServerErrorException('Something went wrong');
};
