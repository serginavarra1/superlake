import { ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { BigQuery } from '@google-cloud/bigquery';
import { GcpStatus, Prisma } from '@prisma/client';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { PrismaService } from '../prisma/prisma.service';
import { OrganizationsService } from '../organizations/organizations.service';
import { handleGcpError } from '../common/gcp-error';
import { buildQuery, serialise } from './dashboard.utils'
import { BatchUpdateWidgetsDto, CreateDashboardDto, CreateWidgetDto, ReportConfigDto, WidgetReportConfigDto, UpdateDashboardDto, UpdateWidgetDto } from './dashboards.types';

@Injectable()
export class DashboardsService {
  private readonly logger = new Logger(DashboardsService.name);

  constructor(
    private prisma: PrismaService,
    private readonly organizationsService: OrganizationsService,
  ) {}

  async list(clerkOrgId: string, clerkUserId: string) {
    const [dashboards, favs] = await Promise.all([
      this.prisma.dashboard.findMany({
        where: { organization: { clerkOrgId } },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.userFavourite.findMany({
        where: { clerkUserId, dashboard: { organization: { clerkOrgId } } },
        select: { dashboardId: true },
      }),
    ]);
    const favSet = new Set(favs.map((f) => f.dashboardId));
    return dashboards.map((d) => ({ ...d, isFavourite: favSet.has(d.id) }));
  }

  async getFavourites(clerkOrgId: string, clerkUserId: string) {
    const favs = await this.prisma.userFavourite.findMany({
      where: { clerkUserId, dashboard: { organization: { clerkOrgId } } },
      include: { dashboard: true },
      orderBy: { dashboard: { updatedAt: 'desc' } },
    });
    return favs.map((f) => ({ ...f.dashboard, isFavourite: true }));
  }

  async toggleFavourite(clerkOrgId: string, clerkUserId: string, dashboardId: string) {
    const dashboard = await this.prisma.dashboard.findFirst({
      where: { id: dashboardId, organization: { clerkOrgId } },
    });
    if (!dashboard) throw new NotFoundException('Dashboard not found');

    const existing = await this.prisma.userFavourite.findUnique({
      where: { clerkUserId_dashboardId: { clerkUserId, dashboardId } },
    });

    if (existing) {
      await this.prisma.userFavourite.delete({
        where: { clerkUserId_dashboardId: { clerkUserId, dashboardId } },
      });
      return { isFavourite: false };
    } else {
      await this.prisma.userFavourite.create({ data: { clerkUserId, dashboardId } });
      return { isFavourite: true };
    }
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

  async duplicate(clerkOrgId: string, id: string) {
    const source = await this.prisma.dashboard.findFirst({
      where: { id, organization: { clerkOrgId } },
      include: { widgets: { orderBy: { createdAt: 'asc' } } },
    });

    if (!source) {
      throw new NotFoundException('Dashboard not found');
    }

    return this.prisma.dashboard.create({
      data: {
        title: `(Copy of) ${source.title}`,
        organizationId: source.organizationId,
        widgets: {
          create: source.widgets.map((w) => ({
            type: w.type,
            config: w.config as unknown as Prisma.InputJsonValue,
            x: w.x,
            y: w.y,
            w: w.w,
            h: w.h,
          })),
        },
      },
      include: { widgets: { orderBy: { createdAt: 'asc' } } },
    });
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

  async executeWidgetsBatchQuery(clerkOrgId: string, queries: ReportConfigDto[]): Promise<(unknown[] | null)[]> {
    const organization = await this.organizationsService.getByClerkOrgId(clerkOrgId);

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    if (organization.gcpStatus !== GcpStatus.active) {
      throw new ForbiddenException(
        `Organization GCP project is not active (status: ${organization.gcpStatus})`,
      );
    }

    const bigquery = new BigQuery({ projectId: organization.gcpProjectId! });

    const settled = await Promise.allSettled(
      queries.map(async (config) => {
        const { sql, params, types } = buildQuery(config);
        const [rows] = await bigquery.query({
          query: sql,
          params: Object.keys(params).length > 0 ? params : undefined,
          types: Object.keys(types).length > 0 ? types : undefined,
        });
        return serialise(rows) as unknown[];
      }),
    );

    return settled.map((r) => {
      if (r.status === 'fulfilled') return r.value;
      this.logger.error('Batch query failed', r.reason instanceof Error ? r.reason.stack : String(r.reason));
      return null;
    });
  }

  async executeWidgetQuery(clerkOrgId: string, config: ReportConfigDto): Promise<unknown[]> {
    const organization = await this.organizationsService.getByClerkOrgId(clerkOrgId);

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    if (organization.gcpStatus !== GcpStatus.active) {
      throw new ForbiddenException(
        `Organization GCP project is not active (status: ${organization.gcpStatus})`,
      );
    }

    const { sql, params, types } = buildQuery(config);
    this.logger.debug(`Running widget data query:\n${sql}`);

    const bigquery = new BigQuery({ projectId: organization.gcpProjectId! });
    try {
      const [rows] = await bigquery.query({
        query: sql,
        params: Object.keys(params).length > 0 ? params : undefined,
        types: Object.keys(types).length > 0 ? types : undefined,
      });
      return serialise(rows) as unknown[];
    } catch (error) {
      handleGcpError(error);
    }
  }

  async validateWidgetConfig(body: unknown): Promise<{ valid: boolean; errors?: string[] }> {
    const instance = plainToInstance(WidgetReportConfigDto, body);
    const errors = await validate(instance);
    if (errors.length > 0) {
      return {
        valid: false,
        errors: errors.flatMap((e) => Object.values(e.constraints ?? {})),
      };
    }
    return { valid: true };
  }
}
