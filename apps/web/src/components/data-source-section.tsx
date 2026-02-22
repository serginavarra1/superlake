import * as React from "react"
import { Check, ChevronsUpDown } from "lucide-react"
import { useDatasets } from "@/hooks/use-datasets"
import { useReportConfig, useReportActions } from "@/contexts/report-builder-context"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

export function DataSourceSection() {
  const [open, setOpen] = React.useState(false)
  const { dataSource } = useReportConfig()
  const { setDataSource } = useReportActions()
  const { data: datasets } = useDatasets()

  const label = dataSource ? (
    <span>{dataSource.datasetId} / <strong>{dataSource.tableId}</strong></span>
  ) : (
    "Select a table…"
  )

  return (
    <div className="px-4 py-3">
      <p className="mb-2 text-xs text-muted-foreground">Data source</p>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between font-normal"
          >
            <div className="flex items-center gap-2 truncate">
              <span className="truncate">{label}</span>
            </div>
            <ChevronsUpDown className="ml-2 size-4 shrink-0 text-muted-foreground" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-0" align="start">
          <Command>
            <CommandInput placeholder="Search tables…" />
            <CommandList>
              <CommandEmpty>No tables found.</CommandEmpty>
              {datasets?.map((dataset) => (
                <CommandGroup key={dataset.datasetId} heading={dataset.datasetId}>
                  {dataset.tables.map((table) => (
                    <CommandItem
                      key={`${dataset.datasetId}·${table.tableId}`}
                      value={`${dataset.datasetId} ${table.tableId}`}
                      onSelect={() => {
                        setDataSource({ datasetId: dataset.datasetId, tableId: table.tableId })
                        setOpen(false)
                      }}
                    >
                      <Check
                        className={cn(
                          "size-4",
                          dataSource?.datasetId === dataset.datasetId &&
                            dataSource?.tableId === table.tableId
                            ? "opacity-100"
                            : "opacity-0"
                        )}
                      />
                      {table.tableId}
                    </CommandItem>
                  ))}
                </CommandGroup>
              ))}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  )
}
