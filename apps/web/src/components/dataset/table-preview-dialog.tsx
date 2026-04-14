import { useState, useMemo } from 'react'
import { Loader2 } from 'lucide-react'
import { AgGridReact } from 'ag-grid-react'
import { ModuleRegistry, AllCommunityModule, themeQuartz, type ColDef } from 'ag-grid-community'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination'
import { useTableRows } from '@/hooks/use-table'
import type { SchemaField } from '@/types/api'

ModuleRegistry.registerModules([AllCommunityModule])

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100]

interface TablePreviewDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  datasetId: string
  tableId: string
  schema: SchemaField[]
  totalRows: number | null
}

export function TablePreviewDialog({
  open,
  onOpenChange,
  datasetId,
  tableId,
  schema,
  totalRows,
}: TablePreviewDialogProps) {
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(50)

  const { data, isLoading, isError } = useTableRows(
    datasetId,
    tableId,
    page,
    pageSize,
    open,
  )

  const colDefs = useMemo((): ColDef[] =>
    schema
      .filter((f) => !f.fields?.length)
      .map((f) => ({
        field: f.name,
        headerName: f.name,
        flex: 1,
        valueFormatter: ({ value }: { value: unknown }) =>
          value == null ? '—' : String(value),
      })),
    [schema],
  )

  const totalPages = totalRows != null ? Math.ceil(totalRows / pageSize) : null
  const isLastPage =
    (totalPages != null && page + 1 >= totalPages) ||
    (data != null && data.rows.length < pageSize)

  function handleOpenChange(val: boolean) {
    if (!val) setPage(0)
    onOpenChange(val)
  }

  function handlePageSizeChange(val: string) {
    setPageSize(Number(val))
    setPage(0)
  }

  function buildPageNumbers(): (number | 'ellipsis')[] {
    if (!totalPages) return [0]
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i)
    const pages: (number | 'ellipsis')[] = [0]
    if (page > 2) pages.push('ellipsis')
    for (let i = Math.max(1, page - 1); i <= Math.min(totalPages - 2, page + 1); i++) {
      pages.push(i)
    }
    if (page < totalPages - 3) pages.push('ellipsis')
    pages.push(totalPages - 1)
    return pages
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-7xl w-full h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {datasetId}.{tableId}
            <span className="text-sm text-muted-foreground font-normal ml-3">
              {totalRows != null
                ? `${totalRows.toLocaleString()} rows total`
                : 'Row count unknown'}
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 min-h-0 rounded overflow-hidden relative">

          {isError && (
            <p className="p-4 text-sm text-destructive">
              Failed to load preview data.
            </p>
          )}

          {!isError && (
            <div className="absolute inset-0">
              <AgGridReact
                theme={themeQuartz}
                rowData={data?.rows ?? []}
                columnDefs={colDefs}
                defaultColDef={{ sortable: false, resizable: true }}
                rowHeight={36}
                headerHeight={36}
                suppressMovableColumns
                loading={isLoading}
                loadingOverlayComponent={() => (
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm">Loading...</span>
                  </div>
                )}
              />
            </div>
          )}
        </div>

        <div className="flex items-center justify-between pt-1 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="text-sm text-muted-foreground">Rows per page</span>
              <Select
                value={String(pageSize)}
                onValueChange={handlePageSizeChange}
              >
                <SelectTrigger className="h-8 w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAGE_SIZE_OPTIONS.map((s) => (
                    <SelectItem key={s} value={String(s)}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Pagination className="w-auto mx-0">
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => setPage((p) => p - 1)}
                  aria-disabled={page === 0 || isLoading}
                  className={page === 0 || isLoading ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                />
              </PaginationItem>

              {buildPageNumbers().map((p, i) =>
                p === 'ellipsis' ? (
                  <PaginationItem key={`ellipsis-${i}`}>
                    <PaginationEllipsis />
                  </PaginationItem>
                ) : (
                  <PaginationItem key={p}>
                    <PaginationLink
                      isActive={p === page}
                      onClick={() => setPage(p)}
                      className="cursor-pointer"
                    >
                      {p + 1}
                    </PaginationLink>
                  </PaginationItem>
                ),
              )}

              <PaginationItem>
                <PaginationNext
                  onClick={() => !isLastPage && !isLoading && setPage((p) => p + 1)}
                  aria-disabled={isLastPage || isLoading}
                  className={isLastPage || isLoading ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      </DialogContent>
    </Dialog>
  )
}
