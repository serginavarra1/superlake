import { Module } from '@nestjs/common';
import { DashboardsController } from './dashboards.controller';
import { DashboardsService } from './dashboards.service';
import { OrganizationsModule } from '../organizations/organizations.module';
import { GcpModule } from '../gcp/gcp.module';

@Module({
  imports: [OrganizationsModule, GcpModule],
  controllers: [DashboardsController],
  providers: [DashboardsService],
})
export class DashboardsModule {}
