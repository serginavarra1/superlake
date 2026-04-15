import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, UsePipes } from '@nestjs/common';
import { DashboardsService } from './dashboards.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ClerkUser } from '../auth/interfaces/clerk-user.interface';
import { BatchUpdateWidgetsDto, CreateDashboardDto, CreateWidgetDto, ReportConfigDto, UpdateDashboardDto, UpdateWidgetDto } from './dashboards.types';

@Controller('dashboards')
export class DashboardsController {
  constructor(private readonly dashboardsService: DashboardsService) {}

  @Get()
  async list(@CurrentUser() user: ClerkUser) {
    return this.dashboardsService.list(user.orgId!, user.userId);
  }

  @Post(':id/favourite')
  async toggleFavourite(@CurrentUser() user: ClerkUser, @Param('id') id: string) {
    return this.dashboardsService.toggleFavourite(user.orgId!, user.userId, id);
  }

  @Post()
  async create(
    @CurrentUser() user: ClerkUser,
    @Body() dto: CreateDashboardDto,
  ) {
    return this.dashboardsService.create(user.orgId!, dto);
  }

  @Get('favourites')
  async getFavourites(@CurrentUser() user: ClerkUser) {
    return this.dashboardsService.getFavourites(user.orgId!, user.userId);
  }

  @Get(':id')
  async findOne(@CurrentUser() user: ClerkUser, @Param('id') id: string) {
    return this.dashboardsService.findOne(user.orgId!, id);
  }

  @Post(':id/duplicate')
  async duplicate(@CurrentUser() user: ClerkUser, @Param('id') id: string) {
    return this.dashboardsService.duplicate(user.orgId!, id);
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

  @Patch(':id/widgets')
  async batchUpdateWidgets(
    @CurrentUser() user: ClerkUser,
    @Param('id') id: string,
    @Body() dto: BatchUpdateWidgetsDto,
  ) {
    return this.dashboardsService.batchUpdateWidgets(user.orgId!, id, dto);
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

  @Post('widget-data/validate')
  @HttpCode(HttpStatus.OK)
  @UsePipes()
  async validateWidgetConfig(@Body() body: unknown) {
    return this.dashboardsService.validateWidgetConfig(body);
  }

  @Post('widget-data')
  async executeWidgetQuery(
    @CurrentUser() user: ClerkUser,
    @Body() config: ReportConfigDto,
  ) {
    return this.dashboardsService.executeWidgetQuery(user.orgId!, config);
  }

  @Post('widget-data/batch')
  async executeWidgetQueries(
    @CurrentUser() user: ClerkUser,
    @Body() dto: { queries: ReportConfigDto[] },
  ) {
    return this.dashboardsService.executeWidgetsBatchQuery(user.orgId!, dto.queries);
  }
}
