import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

export class SelectedTableDto {
  @IsString()
  @IsNotEmpty()
  datasetId!: string;

  @IsString()
  @IsNotEmpty()
  tableId!: string;
}

export class MetricDto {
  @IsString()
  @IsNotEmpty()
  id!: string;

  @IsIn(['sum', 'avg', 'count', 'count_distinct', 'min', 'max'])
  operation!: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  column!: string | null;
}

export class OrderByDto {
  @IsString()
  @IsNotEmpty()
  target!: string;

  @IsIn(['asc', 'desc'])
  direction!: string;
}

export class ReportConfigDto {
  @ValidateNested()
  @Type(() => SelectedTableDto)
  dataSource!: SelectedTableDto;

  @IsOptional()
  @IsString()
  dimension!: string | null;

  @IsOptional()
  @IsIn(['date', 'month_year', 'year'])
  dimensionGranularity!: string | null;

  @IsOptional()
  @IsString()
  groupBy!: string | null;

  @IsOptional()
  @IsIn(['date', 'month_year', 'year'])
  groupByGranularity!: string | null;

  @IsBoolean()
  groupByIncludeEmpty!: boolean;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MetricDto)
  metrics!: MetricDto[];

  @IsOptional()
  @ValidateNested()
  @Type(() => OrderByDto)
  orderBy!: OrderByDto | null;
}
