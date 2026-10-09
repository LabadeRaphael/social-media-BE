import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { MessageType } from '@prisma/client';

export class MessageDto {
  @IsNotEmpty()
  @IsString()
  conversationId!: string;

  
  @IsOptional()
  @IsString()
  text?: string|null;

  @IsNotEmpty()
  @IsEnum(MessageType)
  type!: MessageType;
  
  // for voice 
  @IsOptional()
  @IsString()
  mediaUrl?: string|null;
  
  @IsOptional()
  @IsNumber()
  duration?: number|null;
  
  // for document
  @IsString()
  @IsOptional()
  fileName?: string | null;
  
  @IsNumber()
  @IsOptional()
  fileSize?: number | null;
  
  @IsString()
  @IsOptional()
  fileType?: string | null;
}
