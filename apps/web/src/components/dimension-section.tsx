import { useReportConfig, useReportActions } from "@/contexts/report-builder-context"
import { useTableDetails } from "@/hooks/use-table-details"
import { ColumnPicker } from "@/components/column-picker"
import { GranularityPicker } from "@/components/granularity-picker"
import { Switch } from "@/components/ui/switch"

const DATE_TYPES = new Set(["DATE", "DATETIME", "TIMESTAMP", "TIMESTAMP_NTZ"])

function isDateColumn(schema: { name: string; type: string }[] | undefined, columnName: string): boolean {
  const fieldType = schema?.find((f) => f.name === columnName)?.type ?? ""
  return DATE_TYPES.has(fieldType.toUpperCase())
}

export function DimensionSection() {
  const {
    dataSource,
    dimension,
    dimensionGranularity,
    groupBy,
    groupByGranularity,
    groupByIncludeEmpty,
  } = useReportConfig()
  const actions = useReportActions()

  const { data: tableDetails, isLoading } = useTableDetails(
    dataSource?.datasetId ?? "",
    dataSource?.tableId ?? "",
  )

  const schema = tableDetails?.schema
  const isDimDate = dimension ? isDateColumn(schema, dimension) : false
  const isGroupByDate = groupBy ? isDateColumn(schema, groupBy) : false

  return (
    <div className="px-4 py-3">
      <div className="rounded-xl border p-3">
        <p className="mb-2 text-xs text-muted-foreground">Dimension</p>
        <ColumnPicker
          schema={schema}
          value={dimension}
          disabled={!dataSource || isLoading}
          placeholder="Select a column…"
          triggerClassName="w-full"
          onSelect={(col) => {
            actions.setDimension(col)
            if (col && isDateColumn(schema, col)) actions.setDimensionGranularity(["day", "month", "year"])
          }}
        />
        {isDimDate && (
          <GranularityPicker value={dimensionGranularity} onChange={actions.setDimensionGranularity} />
        )}

        <p className="mb-2 mt-3 text-xs text-muted-foreground">Group by</p>
        <ColumnPicker
          schema={schema}
          value={groupBy}
          disabled={!dataSource || !dimension || isLoading}
          placeholder="None"
          triggerClassName="w-full"
          onSelect={(col) => {
            actions.setGroupBy(col)
            if (col && isDateColumn(schema, col)) actions.setGroupByGranularity(["day", "month", "year"])
          }}
        />
        {isGroupByDate && (
          <GranularityPicker value={groupByGranularity} onChange={actions.setGroupByGranularity} />
        )}

        {groupBy && (
          <div className="mt-3 flex items-center gap-2">
            <Switch
              id="group-by-include-empty"
              checked={groupByIncludeEmpty}
              onCheckedChange={actions.setGroupByIncludeEmpty}
            />
            <label htmlFor="group-by-include-empty" className="cursor-pointer text-xs text-muted-foreground">
              Include empty values
            </label>
          </div>
        )}
      </div>
    </div>
  )
}
