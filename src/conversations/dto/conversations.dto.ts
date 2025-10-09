// import { IsUUID, ArrayMinSize, ArrayMaxSize } from 'class-validator';

// export class ConversationDto {
//   @IsUUID("4", { each: true })
//   @ArrayMinSize(2)
//   @ArrayMaxSize(2)
//   participants: string[];  // exactly 2 user IDs
// }
import { IsUUID, ArrayMinSize } from 'class-validator';

export class ConversationDto {
  @IsUUID('4', { each: true })
  @ArrayMinSize(2) // must have at least two users (1-on-1 or group)
  participants: string[]; // list of user IDs to include in the conversation
}
