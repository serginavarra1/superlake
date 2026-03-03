import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { DashboardsService } from './dashboards.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ClerkUser } from '../auth/interfaces/clerk-user.interface';
import { CreateDashboardDto, CreateWidgetDto, UpdateDashboardDto, UpdateWidgetDto } from './dashboards.types';

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

  @Post(':id/widgets')
  async addWidget(
    @CurrentUser() user: ClerkUser,
    @Param('id') id: string,
    @Body() dto: CreateWidgetDto,
  ) {
    return this.dashboardsService.addWidget(user.orgId!, id, dto);
  }

  @Patch(':id/widgets/:widgetId')
  async updateWidget(
    @CurrentUser() user: ClerkUser,
    @Param('id') id: string,
    @Param('widgetId') widgetId: string,
    @Body() dto: UpdateWidgetDto,
  ) {
    return this.dashboardsService.updateWidget(user.orgId!, id, widgetId, dto);
  }

  @Delete(':id/widgets/:widgetId')
  async deleteWidget(
    @CurrentUser() user: ClerkUser,
    @Param('id') id: string,
    @Param('widgetId') widgetId: string,
  ) {
    return this.dashboardsService.deleteWidget(user.orgId!, id, widgetId);
  }
}
