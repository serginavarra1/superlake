import { AlertCircle, Table as TableIcon } from 'lucide-react'
import { useTableDetails } from '@/hooks/use-table-details'
import { Skeleton } from '@/components/ui/skeleton'
import type { SchemaField, TableDetails } from '@/types/api'

interface TableDetailsPanelProps {
  datasetId: string
  tableId: string
}

function formatBytes(bytes: number | null): string {
  if (bytes === null) return '—'
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
}

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

function TypeBadge({ type }: { type: string }) {
  const colors: Record<string, string> = {
    TABLE: 'bg-emerald-100 text-emerald-700',
    VIEW: 'bg-blue-100 text-blue-700',
    EXTERNAL: 'bg-orange-100 text-orange-700',
    MATERIALIZED_VIEW: 'bg-purple-100 text-purple-700',
  }
  return (
    <span
      className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${colors[type] ?? 'bg-muted text-muted-foreground'}`}
    >
      {type}
    </span>
  )
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-4 px-4 py-2">
      <dt className="w-32 shrink-0 text-sm text-muted-foreground pt-0.5">{label}</dt>
      <dd className="text-sm tabular-nums min-w-0">{value}</dd>
    </div>
  )
}

const modeColors: Record<string, string> = {
  REQUIRED: 'text-red-500',
  REPEATED: 'text-blue-500',
  NULLABLE: 'text-muted-foreground',
}

function flattenFields(
  fields: SchemaField[],
  depth = 0,
): { field: SchemaField; depth: number }[] {
  return fields.flatMap((f) => [
    { field: f, depth },
    ...(f.fields ? flattenFields(f.fields, depth + 1) : []),
  ])
}

function LoadingSkeleton() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-5 w-48" />
        </div>
      </div>
      <div className="rounded-lg border divide-y">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-2.5">
            <Skeleton className="h-4 w-24 shrink-0" />
            <Skeleton className="h-4 w-32" />
          </div>
        ))}
      </div>
      <Skeleton className="h-px w-full" />
      <div className="space-y-2">
        <Skeleton className="h-4 w-20" />
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-full" />
        ))}
      </div>
    </div>
  )
}

function TableDetailsContent({ details }: { details: TableDetails }) {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-4 px-6 py-5 shrink-0">
        <h2 className="text-sm font-semibold">
          <span className="text-muted-foreground font-normal">{details.datasetId}</span>
          <span className="text-muted-foreground font-normal mx-2">/</span>
          {details.tableId}
        </h2>
        <TypeBadge type={details.type} />
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto px-6 space-y-6">
        {/* Details list */}
        <dl className="rounded-lg border divide-y text-sm">
          {details.description && (
            <DetailRow label="Description" value={details.description} />
          )}
          <DetailRow label="Rows" value={details.rowCount !== null ? details.rowCount.toLocaleString() : '—'} />
          <DetailRow label="Size" value={formatBytes(details.sizeBytes)} />
          <DetailRow label="Location" value={details.location ?? '—'} />
          <DetailRow label="Created" value={formatDate(details.createdAt)} />
          <DetailRow label="Last modified" value={formatDate(details.lastModifiedAt)} />
          {details.partitioning && (
            <>
              <DetailRow label="Partition type" value={details.partitioning.type} />
              {details.partitioning.field && (
                <DetailRow label="Partition field" value={details.partitioning.field} />
              )}
              <DetailRow label="Require filter" value={details.partitioning.requireFilter ? 'Yes' : 'No'} />
            </>
          )}
          {details.clustering && (
            <DetailRow label="Clustering" value={details.clustering.fields.join(', ')} />
          )}
          {details.viewQuery && (
            <DetailRow
              label="Query"
              value={
                <pre className="text-sm font-mono whitespace-pre-wrap break-words leading-relaxed">
                  {details.viewQuery}
                </pre>
              }
            />
          )}
        </dl>

        {/* Schema */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold flex items-center gap-1.5">
            <TableIcon className="size-4" />
            Schema
            <span className="ml-auto text-sm font-normal text-muted-foreground">
              {details.schema.length} {details.schema.length === 1 ? 'field' : 'fields'}
            </span>
          </h3>
          {details.schema.length === 0 ? (
            <p className="text-sm text-muted-foreground">No schema available.</p>
          ) : (
            <div className="rounded-lg border divide-y text-sm">
              <div className="flex items-center gap-4 px-4 py-2 bg-muted/40">
                <span className="flex-1 text-sm text-muted-foreground font-medium">Name</span>
                <span className="w-28 text-sm text-muted-foreground font-medium">Type</span>
                <span className="w-24 text-sm text-muted-foreground font-medium">Mode</span>
              </div>
              {flattenFields(details.schema).map(({ field, depth }, i) => (
                <div
                  key={i}
                  className="flex items-start gap-4 py-2 pr-4"
                  style={{ paddingLeft: `${depth * 16 + 16}px` }}
                >
                  <div className="flex-1 min-w-0">
                    <span className="font-mono text-sm font-medium">{field.name}</span>
                    {field.description && (
                      <span className="text-sm text-muted-foreground block">{field.description}</span>
                    )}
                  </div>
                  <span className="w-28 font-mono text-sm text-muted-foreground shrink-0">{field.type}</span>
                  <span className={`w-24 text-sm shrink-0 ${modeColors[field.mode] ?? 'text-muted-foreground'}`}>
                    {field.mode}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export function TableDetailsPanel({ datasetId, tableId }: TableDetailsPanelProps) {
  const { data, isLoading, error } = useTableDetails(datasetId, tableId)

  if (isLoading) return <LoadingSkeleton />

  if (error) {
    return (
      <div className="flex flex-col items-center gap-3 p-8 text-center">
        <AlertCircle className="size-8 text-destructive" />
        <div>
          <p className="text-sm font-medium">Failed to load table details</p>
          <p className="text-sm text-muted-foreground mt-1">{error.message}</p>
        </div>
      </div>
    )
  }

  if (!data) return null

  return <TableDetailsContent details={data} />
}