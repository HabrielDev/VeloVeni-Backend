import { IsString, IsNotEmpty } from 'class-validator';

export class GetRouteDto {
  @IsString()
  @IsNotEmpty()
  stravaId: string;
}