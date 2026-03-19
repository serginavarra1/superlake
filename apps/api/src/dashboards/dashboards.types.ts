import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
  ValidationArguments,
  ValidationOptions,
  registerDecorator,
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

const FILTER_OPERATORS = [
  'is_null', 'is_not_null',
  'equals', 'not_equals',
  'contains', 'not_contains',
  'starts_with', 'ends_with',
  'greater_than', 'less_than',
  'greater_than_or_equal', 'less_than_or_equal',
  'in', 'not_in',
];

export class FilterConditionDto {
  @IsString()
  @IsNotEmpty()
  id!: string;

  @IsString()
  @IsNotEmpty()
  column!: string;

  @IsIn(FILTER_OPERATORS)
  operator!: string;

  @IsOptional()
  @IsString({ each: true })
  value!: string | string[] | null;
}

export class FilterDto {
  @IsString()
  @IsNotEmpty()
  id!: string;

  @IsString()
  name!: string;

  @ValidateNested()
  @Type(() => FilterConditionDto)
  condition!: FilterConditionDto;
}

export class ReportConfigDto {
  @ValidateNested()
  @Type(() => SelectedTableDto)
  dataSource!: SelectedTableDto;

  @IsOptional()
  @IsString()
  dimension!: string | null;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @IsIn(['day', 'month', 'year'], { each: true })
  dimensionGranularity!: string[] | null;

  @IsOptional()
  @IsString()
  groupBy!: string | null;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @IsIn(['day', 'month', 'year'], { each: true })
  groupByGranularity!: string[] | null;

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

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FilterDto)
  filters?: FilterDto[];
}

export class CreateDashboardDto {
  @IsString()
  @IsNotEmpty()
  title!: string;
}

export class UpdateDashboardDto {
  @IsString()
  @IsNotEmpty()
  title!: string;
}

class VisualizationConfigDto {
  @IsIn(['bar', 'line', 'pie', 'single_metric'])
  type!: string;

  @IsBoolean()
  stacked!: boolean;
}

function IsVisualizationCompatible(options?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isVisualizationCompatible',
      target: (object as { constructor: Function }).constructor,
      propertyName,
      options,
      validator: {
        validate(value: VisualizationConfigDto | null | undefined, args: ValidationArguments) {
          if (!value) return true;
          const config = args.object as WidgetReportConfigDto;
          if (value.type === 'pie') {
            return !config.groupBy && (config.metrics?.length ?? 0) === 1;
          }
          if (value.type === 'single_metric') {
            return !config.dimension && !config.groupBy;
          }
          return true;
        },
        defaultMessage(args: ValidationArguments) {
          const viz = args.value as VisualizationConfigDto;
          if (viz?.type === 'pie')
            return 'Pie visualization requires exactly 1 metric and no groupBy';
          if (viz?.type === 'single_metric')
            return 'Single metric visualization requires no dimension and no groupBy';
          return 'Visualization type is incompatible with the current config';
        },
      },
    });
  };
}

export class WidgetReportConfigDto {
  @IsString()
  title!: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => SelectedTableDto)
  dataSource?: SelectedTableDto | null;

  @IsOptional()
  @IsString()
  dimension?: string | null;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @IsIn(['day', 'month', 'year'], { each: true })
  dimensionGranularity?: string[] | null;

  @IsOptional()
  @IsString()
  groupBy?: string | null;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @IsIn(['day', 'month', 'year'], { each: true })
  groupByGranularity?: string[] | null;

  @IsBoolean()
  groupByIncludeEmpty!: boolean;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MetricDto)
  metrics!: MetricDto[];

  @IsOptional()
  @ValidateNested()
  @Type(() => OrderByDto)
  orderBy?: OrderByDto | null;

  @IsOptional()
  @ValidateNested()
  @Type(() => VisualizationConfigDto)
  @IsVisualizationCompatible()
  visualization?: VisualizationConfigDto | null;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FilterDto)
  filters!: FilterDto[];
}

export class CreateWidgetDto {
  @IsIn(['report'])
  type!: string;

  @ValidateNested()
  @Type(() => WidgetReportConfigDto)
  config!: WidgetReportConfigDto;

  @IsInt()
  x!: number;

  @IsInt()
  y!: number;

  @IsInt()
  w!: number;

  @IsInt()
  h!: number;
}

export class UpdateWidgetDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => WidgetReportConfigDto)
  config?: WidgetReportConfigDto;

  @IsOptional()
  @IsInt()
  x?: number;

  @IsOptional()
  @IsInt()
  y?: number;

  @IsOptional()
  @IsInt()
  w?: number;

  @IsOptional()
  @IsInt()
  h?: number;
}

export class BatchUpdateWidgetItemDto {
  @IsString()
  id!: string;

  @IsInt()
  x!: number;

  @IsInt()
  y!: number;

  @IsInt()
  w!: number;

  @IsInt()
  h!: number;
}

export class BatchUpdateWidgetsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BatchUpdateWidgetItemDto)
  widgets!: BatchUpdateWidgetItemDto[];
}
