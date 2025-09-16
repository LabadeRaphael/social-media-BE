import { IsUUID, ArrayMinSize, ArrayMaxSize } from 'class-validator';

export class ConversationDto {
  @IsUUID("4", { each: true })
  @ArrayMinSize(2)
  @ArrayMaxSize(2)
  participants: string[];  // exactly 2 user IDs
}
