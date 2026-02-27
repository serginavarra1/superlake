import { Controller, Get, Param } from '@nestjs/common';
import { DatasetsService } from './datasets.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ClerkUser } from '../auth/interfaces/clerk-user.interface';

@Controller('datasets')
export class DatasetsController {
  constructor(private readonly datasetsService: DatasetsService) {}

  @Get()
  async listDatasets(@CurrentUser() user: ClerkUser) {
    return this.datasetsService.listDatasets(user.orgId!);
  }

  @Get(':datasetId/tables/:tableId')
  async getTableDetails(
    @CurrentUser() user: ClerkUser,
    @Param('datasetId') datasetId: string,
    @Param('tableId') tableId: string,
  ) {
    return this.datasetsService.getTableDetails(user.orgId!, datasetId, tableId);
  }

  @Get(':datasetId/tables/:tableId/columns/:column/distinct-values')
  async getDistinctValues(
    @CurrentUser() user: ClerkUser,
    @Param('datasetId') datasetId: string,
    @Param('tableId') tableId: string,
    @Param('column') column: string,
  ) {
    return this.datasetsService.getDistinctValues(user.orgId!, datasetId, tableId, column);
  }
}
