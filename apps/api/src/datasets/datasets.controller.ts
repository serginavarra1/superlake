import { Controller, Get } from '@nestjs/common';
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
}
