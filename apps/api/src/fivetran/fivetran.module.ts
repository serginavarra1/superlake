import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { GcpModule } from '../gcp/gcp.module';
import { FivetranClient } from './fivetran.client';
import { FivetranService } from './fivetran.service';
import { FivetranController } from './fivetran.controller';

@Module({
  imports: [PrismaModule, GcpModule],
  controllers: [FivetranController],
  providers: [FivetranClient, FivetranService],
  exports: [FivetranService],
})
export class FivetranModule {}