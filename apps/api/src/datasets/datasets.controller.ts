import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch } from '@nestjs/common';
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

  @Patch(':datasetId/tables/:tableId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async updateTable(
    @CurrentUser() user: ClerkUser,
    @Param('datasetId') datasetId: string,
    @Param('tableId') tableId: string,
    @Body() body: { description?: string; fieldDescriptions?: { path: string; description: string }[] },
  ) {
    await this.datasetsService.updateTable(user.orgId!, datasetId, tableId, body);
  }

  @Delete(':datasetId/tables/:tableId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteTable(
    @CurrentUser() user: ClerkUser,
    @Param('datasetId') datasetId: string,
    @Param('tableId') tableId: string,
  ) {
    await this.datasetsService.deleteTable(user.orgId!, datasetId, tableId);
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
