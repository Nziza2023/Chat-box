import { IsEmail, IsString, Matches, MaxLength, MinLength } from 'class-validator';

// class-validator checks every incoming request body automatically
// (we wire this up globally in main.ts with a ValidationPipe).
// If any rule fails, NestJS returns a 400 error with a clear message
// before our code even runs — so we never have to manually check "is this a valid email?"
export class RegisterDto {
  @IsString()
  @MinLength(3, { message: 'Username must be at least 3 characters' })
  @MaxLength(20, { message: 'Username must be at most 20 characters' })
  @Matches(/^[a-zA-Z0-9_]+$/, {
    message: 'Username can only contain letters, numbers, and underscores',
  })
  username: string;

  @IsEmail({}, { message: 'Please provide a valid email address' })
  email: string;

  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  @MaxLength(72, { message: 'Password must be at most 72 characters' })
  password: string;

  @IsString()
  @MinLength(1, { message: 'Display name is required' })
  @MaxLength(50)
  displayName: string;
}
