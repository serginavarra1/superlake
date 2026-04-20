import { Module } from '@nestjs/common';
import { OrganizationsService } from './organizations.service';
import { PrismaModule } from '../prisma/prisma.module';
import { GcpModule } from '../gcp/gcp.module';
import { FivetranModule } from '../fivetran/fivetran.module';

@Module({
  imports: [PrismaModule, GcpModule, FivetranModule],
  providers: [OrganizationsService],
  exports: [OrganizationsService],
})
export class OrganizationsModule {}
