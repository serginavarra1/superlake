import { Module } from '@nestjs/common';
import { HomeController } from './home.controller';
import { HomeService } from './home.service';
import { PrismaModule } from '../prisma/prisma.module';
import { DatasetsModule } from '../datasets/datasets.module';

@Module({
  imports: [PrismaModule, DatasetsModule],
  controllers: [HomeController],
  providers: [HomeService],
})
export class HomeModule {}
