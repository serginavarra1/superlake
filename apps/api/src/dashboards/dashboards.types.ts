import { IsNotEmpty, IsString } from 'class-validator';

export class CreateDashboardDto {
  @IsString()
  @IsNotEmpty()
  title!: string;
}

export class UpdateDashboardDto {
  @IsString()
  @IsNotEmpty()
  title!: string;
}
