import { plainToInstance } from 'class-transformer';
import { IsString, IsOptional, validateSync } from 'class-validator';

class EnvironmentVariables {
  @IsString()
  DATABASE_URL!: string;

  @IsString()
  CLERK_SECRET_KEY!: string;

  @IsString()
  CLERK_PUBLISHABLE_KEY!: string;

  @IsString()
  CLERK_WEBHOOK_SECRET!: string;

  @IsString()
  GCP_PARENT_FOLDER_ID!: string;

  @IsString()
  GCP_BILLING_ACCOUNT_ID!: string;

  @IsString()
  GCP_BQ_READ_SA!: string;

  @IsString()
  GCP_BQ_WRITE_SA!: string;

  @IsString()
  FIVETRAN_API_KEY!: string;

  @IsString()
  FIVETRAN_API_SECRET!: string;

  @IsString()
  @IsOptional()
  FIVETRAN_BASE_URL?: string;

  @IsString()
  FIVETRAN_WEBHOOK_SECRET!: string;

  @IsString()
  FIVETRAN_CONNECT_CARD_REDIRECT_URL!: string;

  @IsString()
  @IsOptional()
  CORS_ORIGIN?: string;

  @IsString()
  @IsOptional()
  PORT?: string;
}

export function validate(config: Record<string, unknown>) {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    throw new Error(
      `Config validation error:\n${errors.map((e) => Object.values(e.constraints ?? {}).join(', ')).join('\n')}`,
    );
  }

  return validatedConfig;
}
