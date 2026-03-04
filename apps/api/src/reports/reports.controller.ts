import { Body, Controller, Post } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ClerkUser } from '../auth/interfaces/clerk-user.interface';
import { ReportConfigDto } from './reports.types';

@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Post('query')
  async runQuery(
    @CurrentUser() user: ClerkUser,
    @Body() config: ReportConfigDto,
  ) {
    return this.reportsService.runQuery(user.orgId!, config);
  }

  @Post('batch-query')
  async batchQuery(
    @CurrentUser() user: ClerkUser,
    @Body() dto: { queries: ReportConfigDto[] },
  ) {
    return this.reportsService.batchRunQuery(user.orgId!, dto.queries);
  }
}
