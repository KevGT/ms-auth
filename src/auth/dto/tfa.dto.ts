import { IsString } from 'class-validator';
export class TfaVerifyDto { @IsString() code!: string; }
