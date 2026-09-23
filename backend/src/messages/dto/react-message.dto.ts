import { IsString, MaxLength } from 'class-validator';

export class ReactMessageDto {
  @IsString()
  @MaxLength(8)
  emoji: string;
}
