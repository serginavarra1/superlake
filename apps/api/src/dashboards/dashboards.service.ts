import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDashboardDto, UpdateDashboardDto } from './dashboards.types';

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
}
