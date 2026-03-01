import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { DashboardsService } from './dashboards.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ClerkUser } from '../auth/interfaces/clerk-user.interface';
import { CreateDashboardDto, UpdateDashboardDto } from './dashboards.types';

@Controller('dashboards')
export class DashboardsController {
  constructor(private readonly dashboardsService: DashboardsService) {}

  @Get()
  async list(@CurrentUser() user: ClerkUser) {
    return this.dashboardsService.list(user.orgId!);
  }

  @Post()
  async create(
    @CurrentUser() user: ClerkUser,
    @Body() dto: CreateDashboardDto,
  ) {
    return this.dashboardsService.create(user.orgId!, dto);
  }

  @Get(':id')
  async findOne(@CurrentUser() user: ClerkUser, @Param('id') id: string) {
    return this.dashboardsService.findOne(user.orgId!, id);
  }

  @Patch(':id')
  async updateTitle(
    @CurrentUser() user: ClerkUser,
    @Param('id') id: string,
    @Body() dto: UpdateDashboardDto,
  ) {
    return this.dashboardsService.updateTitle(user.orgId!, id, dto);
  }

  @Delete(':id')
  async delete(@CurrentUser() user: ClerkUser, @Param('id') id: string) {
    return this.dashboardsService.delete(user.orgId!, id);
  }
}
