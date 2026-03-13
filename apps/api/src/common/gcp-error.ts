import {
  BadRequestException,
  ForbiddenException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';

/**
 * Maps Google Cloud SDK errors (both HTTP-style BigQuery codes and gRPC codes
 * from Resource Manager / Service Usage / Billing) to NestJS HTTP exceptions.
 */
export function handleGcpError(error: unknown): never {
  const code = (error as any)?.code;
  const message = error instanceof Error ? error.message : String(error);

  // HTTP codes (BigQuery) || gRPC codes (Resource Manager, Service Usage, Billing)
  if (code === 404 || code === 5) throw new NotFoundException(message);
  if (code === 403 || code === 7) throw new ForbiddenException(message);
  if (code === 400 || code === 3) throw new BadRequestException(message);
  if (code === 409 || code === 6) throw new BadRequestException(message);

  throw new InternalServerErrorException(`GCP operation failed: ${message}`);
}
