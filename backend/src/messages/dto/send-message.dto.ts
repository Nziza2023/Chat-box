import { IsEnum, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

const MESSAGE_TYPES = ['TEXT', 'IMAGE', 'VIDEO', 'AUDIO', 'FILE'] as const;

export class SendMessageDto {
  @IsString()
  conversationId: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  content?: string;

  @IsOptional()
  @IsIn(MESSAGE_TYPES)
  messageType?: (typeof MESSAGE_TYPES)[number];

  @IsOptional()
  @IsString()
  replyToId?: string;

  // Populated after a successful upload via POST /files/upload
  @IsOptional()
  attachment?: {
    url: string;
    fileName: string;
    mimeType: string;
    sizeBytes: number;
    width?: number;
    height?: number;
    durationSeconds?: number;
  };
}
