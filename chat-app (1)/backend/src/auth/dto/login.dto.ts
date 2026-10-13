import { IsString, MinLength } from 'class-validator';

// Users can log in with either their username or email — we call this field
// "identifier" and figure out which one it is inside the auth service.
export class LoginDto {
  @IsString()
  identifier: string;

  @IsString()
  @MinLength(1)
  password: string;
}
