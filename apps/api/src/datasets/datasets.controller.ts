import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { DatasetsService } from './datasets.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ClerkUser } from '../auth/interfaces/clerk-user.interface';
import { SchemaField } from './datasets.types';

@Controller('datasets')
export class DatasetsController {
  constructor(private readonly datasetsService: DatasetsService) {}

  @Get()
  async listDatasets(@CurrentUser() user: ClerkUser) {
    return this.datasetsService.listDatasets(user.orgId!);
  }

  @Get('ids')
  async listDatasetIds(@CurrentUser() user: ClerkUser) {
    return this.datasetsService.listDatasetIds(user.orgId!);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createDataset(
    @CurrentUser() user: ClerkUser,
    @Body() body: { datasetId: string; location?: string; description?: string },
  ) {
    return this.datasetsService.createDataset(user.orgId!, body);
  }

  @Post(':datasetId/tables')
  @HttpCode(HttpStatus.CREATED)
  async createTable(
    @CurrentUser() user: ClerkUser,
    @Param('datasetId') datasetId: string,
    @Body() body: { tableId: string; schema: SchemaField[]; description?: string },
  ) {
    return this.datasetsService.createTable(user.orgId!, datasetId, body);
  }

  @Post('/excel-meta')
  @UseInterceptors(FileInterceptor('file'))
  async getExcelMeta(
    @CurrentUser() user: ClerkUser,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.datasetsService.getExcelMeta(user.orgId!, file.buffer);
  }

  @Post(':datasetId/tables/from-file')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FileInterceptor('file'))
  async createTableFromFile(
    @CurrentUser() user: ClerkUser,
    @Param('datasetId') datasetId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body()
    body: {
      tableId: string;
      fileType: 'csv' | 'excel' | 'json';
      description?: string;
      sheet?: string;
      startRow?: string;
    },
  ) {
    return this.datasetsService.createTableFromFile(
      user.orgId!,
      datasetId,
      { ...body, startRow: body.startRow ? parseInt(body.startRow, 10) : undefined },
      file.buffer,
    );
  }

  @Get(':datasetId/tables')
  async listTables(
    @CurrentUser() user: ClerkUser,
    @Param('datasetId') datasetId: string,
  ) {
    return this.datasetsService.listTables(user.orgId!, datasetId);
  }

  @Get(':datasetId/tables/:tableId')
  async getTableDetails(
    @CurrentUser() user: ClerkUser,
    @Param('datasetId') datasetId: string,
    @Param('tableId') tableId: string,
  ) {
    return this.datasetsService.getTableDetails(user.orgId!, datasetId, tableId);
  }

  @Get(':datasetId/tables/:tableId/rows')
  async getTableRows(
    @CurrentUser() user: ClerkUser,
    @Param('datasetId') datasetId: string,
    @Param('tableId') tableId: string,
    @Query('startIndex') startIndex = '0',
    @Query('maxResults') maxResults = '50',
  ) {
    return this.datasetsService.getTableRows(
      user.orgId!,
      datasetId,
      tableId,
      parseInt(startIndex, 10),
      parseInt(maxResults, 10),
    );
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
