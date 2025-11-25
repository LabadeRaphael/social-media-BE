import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { MessageType } from '@prisma/client';

export class MessageDto {
  @IsNotEmpty()
  @IsString()
  conversationId: string;

  

  // message text (for TEXT) or URL/path (for IMAGE/FILE/VOICE)
  @IsOptional()
  @IsString()
  text?: string|null;

  @IsNotEmpty()
  @IsEnum(MessageType)
  type: MessageType;
  

  @IsOptional()
  @IsString()
  mediaUrl?: string|null;
}
