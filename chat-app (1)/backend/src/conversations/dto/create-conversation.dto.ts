import { IsString } from 'class-validator';

// For now this starts a DIRECT (1-on-1) conversation with the given user.
// Group support can extend this later with a memberIds array + name.
export class CreateConversationDto {
  @IsString()
  targetUserId: string;
}
