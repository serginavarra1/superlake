import { IsInt, IsOptional, IsString, Matches, Max, Min } from 'class-validator';

export class CreateConnectionDto {
  @IsString()
  service!: string;

  @IsString()
  @Matches(/^[a-z_][a-z0-9_]{0,62}$/i, {
    message: 'schemaName must be a valid identifier (letters, digits, underscore)',
  })
  schemaName!: string;

  @IsOptional()
  @IsInt()
  @Min(5)
  @Max(1440)
  syncFrequency?: number;
}
