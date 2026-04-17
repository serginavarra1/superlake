import { Module } from '@nestjs/common';
import { DatasetsController } from './datasets.controller';
import { DatasetsService } from './datasets.service';
import { OrganizationsModule } from '../organizations/organizations.module';
import { GcpModule } from '../gcp/gcp.module';

@Module({
  imports: [OrganizationsModule, GcpModule],
  controllers: [DatasetsController],
  providers: [DatasetsService],
  exports: [DatasetsService],
})
export class DatasetsModule {}
