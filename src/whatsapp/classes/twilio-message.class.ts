import { IsNotEmpty, IsString } from 'class-validator';

export class TwilioMessage {
  @IsString()
  @IsNotEmpty()
  to: string;

  @IsString()
  @IsNotEmpty()
  message: string;

  @IsString()
  @IsNotEmpty()
  branchPhone: string;
}
