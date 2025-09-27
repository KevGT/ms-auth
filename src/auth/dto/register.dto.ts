import { IsEmail, IsInt, IsOptional, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @IsString() username!: string;
  @IsEmail() email!: string;
  @IsString() @MinLength(8) password!: string;

  @IsInt()
  idPais!: number;

  @IsOptional()
  @IsInt()
  idCorporacion?: number;
}
