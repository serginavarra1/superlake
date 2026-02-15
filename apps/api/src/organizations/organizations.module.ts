import { Module } from '@nestjs/common';
import { OrganizationsService } from './organizations.service';
import { PrismaModule } from '../prisma/prisma.module';
import { GcpModule } from '../gcp/gcp.module';

@Module({
  imports: [PrismaModule, GcpModule],
  providers: [OrganizationsService],
  exports: [OrganizationsService],
})
export class OrganizationsModule {}
