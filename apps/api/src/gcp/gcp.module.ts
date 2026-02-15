import { Module } from '@nestjs/common';
import { GcpService } from './gcp.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [GcpService],
  exports: [GcpService],
})
export class GcpModule {}
