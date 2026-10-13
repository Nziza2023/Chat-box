import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateStoryDto {
  @IsString()
  mediaUrl: string;

  @IsIn(['IMAGE', 'VIDEO'])
  mediaType: 'IMAGE' | 'VIDEO';

  @IsOptional()
  @IsString()
  @MaxLength(200)
  caption?: string;
}
