import { Module } from '@nestjs/common';
import { GcpService } from './gcp.service';
import { BigQueryClientFactory } from './bigquery-client.factory';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [GcpService, BigQueryClientFactory],
  exports: [GcpService, BigQueryClientFactory],
})
export class GcpModule {}
