import { IsEmail, IsNotEmpty, IsString, MinLength, Matches, IsOptional, IsEnum } from 'class-validator';

export class RegisterDto {
  @IsEmail({}, { message: 'Invalid email address' })
  @IsNotEmpty()
  email: string;

  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  @Matches(/(?=.*[A-Z])/, { message: 'Password must contain at least 1 uppercase letter' })
  @Matches(/(?=.*\d)/, { message: 'Password must contain at least 1 digit' })
  password: string;

  @IsOptional()
  @IsEnum(['admin', 'marketing_manager', 'analyst'], { message: 'Invalid role' })
  role?: string;
}
