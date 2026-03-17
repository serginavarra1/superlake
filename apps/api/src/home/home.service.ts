import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DatasetsService } from '../datasets/datasets.service';
import type { DatasetInfo } from '../datasets/datasets.types';

@Injectable()
export class HomeService {
  constructor(
    private prisma: PrismaService,
    private datasetsService: DatasetsService,
  ) {}

  async getStats(clerkOrgId: string, clerkUserId: string) {
    const [reportsCount, favourites, datasets] = await Promise.all([
      this.prisma.dashboard.count({ where: { organization: { clerkOrgId } } }),
      this.prisma.dashboard.findMany({
        where: { organization: { clerkOrgId }, favourites: { some: { clerkUserId } } },
        select: { id: true, title: true, updatedAt: true },
        orderBy: { updatedAt: 'desc' },
      }),
      (this.datasetsService.listDatasets(clerkOrgId) as Promise<DatasetInfo[]>).catch(() => [] as DatasetInfo[]),
    ]);

    return {
      reportsCount,
      datasetsCount: datasets.length,
      tablesCount: datasets.reduce((s, d) => s + d.tables.length, 0),
      favouriteDashboards: favourites.map((d) => ({
        id: d.id,
        title: d.title,
        updatedAt: d.updatedAt.toISOString(),
      })),
    };
  }
}
