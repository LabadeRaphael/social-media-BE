import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { MessageType } from '@prisma/client';

export class MessageDto {
  @IsNotEmpty()
  @IsString()
  conversationId: string;

  // @IsNotEmpty()
  // @IsString()
  // senderId: string;

  // message text (for TEXT) or URL/path (for IMAGE/FILE/VOICE)
  @IsOptional()
  @IsString()
  text?: string;

  @IsNotEmpty()
  @IsEnum(MessageType)
  type: MessageType;
  
  @IsNotEmpty()
  @IsString()
  mediaUrl?: string|null;
}
