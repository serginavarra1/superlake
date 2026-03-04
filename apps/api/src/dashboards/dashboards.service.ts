import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { BatchUpdateWidgetsDto, CreateDashboardDto, CreateWidgetDto, UpdateDashboardDto, UpdateWidgetDto } from './dashboards.types';

@Injectable()
export class DashboardsService {
  constructor(private prisma: PrismaService) {}

  async list(clerkOrgId: string) {
    return this.prisma.dashboard.findMany({
      where: { organization: { clerkOrgId } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(clerkOrgId: string, dto: CreateDashboardDto) {
    const organization = await this.prisma.organization.findUnique({
      where: { clerkOrgId },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    return this.prisma.dashboard.create({
      data: {
        title: dto.title,
        organizationId: organization.id,
      },
    });
  }

  async findOne(clerkOrgId: string, id: string) {
    const dashboard = await this.prisma.dashboard.findFirst({
      where: { id, organization: { clerkOrgId } },
      include: { widgets: { orderBy: { createdAt: 'asc' } } },
    });

    if (!dashboard) {
      throw new NotFoundException('Dashboard not found');
    }

    return dashboard;
  }

  async updateTitle(clerkOrgId: string, id: string, dto: UpdateDashboardDto) {
    const dashboard = await this.prisma.dashboard.findFirst({
      where: { id, organization: { clerkOrgId } },
    });

    if (!dashboard) {
      throw new NotFoundException('Dashboard not found');
    }

    return this.prisma.dashboard.update({
      where: { id },
      data: { title: dto.title },
    });
  }

  async delete(clerkOrgId: string, id: string) {
    const dashboard = await this.prisma.dashboard.findFirst({
      where: { id, organization: { clerkOrgId } },
    });

    if (!dashboard) {
      throw new NotFoundException('Dashboard not found');
    }

    return this.prisma.dashboard.delete({ where: { id } });
  }

  async addWidget(clerkOrgId: string, dashboardId: string, dto: CreateWidgetDto) {
    const dashboard = await this.prisma.dashboard.findFirst({
      where: { id: dashboardId, organization: { clerkOrgId } },
    });

    if (!dashboard) {
      throw new NotFoundException('Dashboard not found');
    }

    return this.prisma.dashboardWidget.create({
      data: {
        dashboardId,
        type: dto.type as any,
        config: dto.config as unknown as Prisma.InputJsonValue,
        x: dto.x,
        y: dto.y,
        w: dto.w,
        h: dto.h,
      },
    });
  }

  async updateWidget(
    clerkOrgId: string,
    dashboardId: string,
    widgetId: string,
    dto: UpdateWidgetDto,
  ) {
    const widget = await this.prisma.dashboardWidget.findFirst({
      where: { id: widgetId, dashboard: { id: dashboardId, organization: { clerkOrgId } } },
    });

    if (!widget) {
      throw new NotFoundException('Widget not found');
    }

    return this.prisma.dashboardWidget.update({
      where: { id: widgetId },
      data: {
        ...(dto.config !== undefined && { config: dto.config as unknown as Prisma.InputJsonValue }),
        ...(dto.x !== undefined && { x: dto.x }),
        ...(dto.y !== undefined && { y: dto.y }),
        ...(dto.w !== undefined && { w: dto.w }),
        ...(dto.h !== undefined && { h: dto.h }),
      },
    });
  }

  async batchUpdateWidgets(clerkOrgId: string, dashboardId: string, dto: BatchUpdateWidgetsDto) {
    const dashboard = await this.prisma.dashboard.findFirst({
      where: { id: dashboardId, organization: { clerkOrgId } },
    });

    if (!dashboard) {
      throw new NotFoundException('Dashboard not found');
    }

    await this.prisma.$transaction(
      dto.widgets.map((item) =>
        this.prisma.dashboardWidget.update({
          where: { id: item.id, dashboardId },
          data: { x: item.x, y: item.y, w: item.w, h: item.h },
        }),
      ),
    );
  }

  async deleteWidget(clerkOrgId: string, dashboardId: string, widgetId: string) {
    const widget = await this.prisma.dashboardWidget.findFirst({
      where: { id: widgetId, dashboard: { id: dashboardId, organization: { clerkOrgId } } },
    });

    if (!widget) {
      throw new NotFoundException('Widget not found');
    }

    return this.prisma.dashboardWidget.delete({ where: { id: widgetId } });
  }
}
