import { Check, OctagonPause, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { type ToolCall } from '@/hooks/use-chat-messages'
import { ReportChart } from '@/components/report/report-chart'
import { useReportQuery } from '@/hooks/use-report-query'
import type {
  ReportConfig,
  SelectedTable,
  Metric,
  DimensionGranularity,
  OrderByConfig,
  VisualizationConfig,
  ReportFilter,
} from '@/contexts/report-builder-context'

// BigQuery schema field — move to a shared types file if other components need this
type SchemaField = {
  name: string
  type: string
  mode: string
  description?: string
  fields?: SchemaField[]
}

// ── Error helpers ──────────────────────────────────────────────────────────────

function getErrorMessage(result: unknown): string | null {
  if (result && typeof result === 'object' && !Array.isArray(result)) {
    const r = result as Record<string, unknown>
    if (typeof r.error === 'string') return r.error
  }
  return null
}

function ToolError({ message }: { message: string }) {
  return (
    <p className="text-destructive text-xs font-sans">
      Error: {message}
    </p>
  )
}

// ── Per-tool renderers ─────────────────────────────────────────────────────────
// To add support for a new tool, add an entry here — no switch statements to update.

type ToolInputRenderer = (args: Record<string, unknown>) => React.ReactNode
type ToolResultRenderer = (result: unknown) => React.ReactNode

const TOOL_RENDERERS: Record<string, { input?: ToolInputRenderer; result?: ToolResultRenderer }> = {
  listDatasetsTool: {
    result: (result) => {
      const datasets = result as Array<{ datasetId: string }>
      if (!Array.isArray(datasets) || datasets.length === 0)
        return <span className="text-muted-foreground">No datasets found</span>
      return (
        <div className="flex flex-wrap gap-1">
          {datasets.map((d) => (
            <span key={d.datasetId} className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px]">
              {d.datasetId}
            </span>
          ))}
        </div>
      )
    },
  },

  listTablesTool: {
    input: (args) => (
      <span>
        Dataset: <code className="bg-muted px-1 rounded">{String(args.datasetId ?? '')}</code>
      </span>
    ),
    result: (result) => {
      const tables = result as Array<{ tableId: string; type: string }>
      if (!Array.isArray(tables) || tables.length === 0)
        return <span className="text-muted-foreground">No tables found</span>
      return (
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border">
              <th className="pb-1 pr-3 text-left font-medium text-muted-foreground">Table</th>
              <th className="pb-1 text-left font-medium text-muted-foreground">Type</th>
            </tr>
          </thead>
          <tbody>
            {tables.map((t) => (
              <tr key={t.tableId} className="border-b border-border/50 last:border-0">
                <td className="py-0.5 pr-3 font-mono">{t.tableId}</td>
                <td className="py-0.5 text-muted-foreground">{t.type}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )
    },
  },

  getTableDetailsTool: {
    input: (args) => (
      <span>
        Table:{' '}
        <code className="bg-muted px-1 rounded">
          {String(args.datasetId ?? '')}.{String(args.tableId ?? '')}
        </code>
      </span>
    ),
    result: (result) => {
      const details = result as {
        tableId: string
        datasetId: string
        description?: string
        schema: SchemaField[]
        rowCount: number | null
        partitioning?: { type: string; field?: string; requireFilter: boolean }
      }
      return (
        <div className="space-y-2">
          {details.description && (
            <p className="text-muted-foreground">{details.description}</p>
          )}
          <div className="flex flex-wrap gap-3 text-xs">
            {details.rowCount !== null && (
              <span>
                <span className="text-muted-foreground">Rows: </span>
                <span className="font-mono">{details.rowCount.toLocaleString()}</span>
              </span>
            )}
            {details.partitioning && (
              <span>
                <span className="text-muted-foreground">Partition: </span>
                <span className="font-mono">
                  {details.partitioning.type}
                  {details.partitioning.field ? ` (${details.partitioning.field})` : ''}
                </span>
              </span>
            )}
          </div>
          {Array.isArray(details.schema) && details.schema.length > 0 && (
            <table className="w-full text-[11px]">
              <thead>
                <tr className="border-b border-border">
                  <th className="pb-1 pr-3 text-left font-medium text-muted-foreground">Field</th>
                  <th className="pb-1 pr-3 text-left font-medium text-muted-foreground">Type</th>
                  <th className="pb-1 pr-3 text-left font-medium text-muted-foreground">Mode</th>
                  <th className="pb-1 text-left font-medium text-muted-foreground">Description</th>
                </tr>
              </thead>
              <tbody>
                {details.schema.map((f) => (
                  <tr key={f.name} className="border-b border-border/50 last:border-0">
                    <td className="py-0.5 pr-3 font-mono">{f.name}</td>
                    <td className="py-0.5 pr-3 text-muted-foreground">{f.type}</td>
                    <td className="py-0.5 pr-3 text-muted-foreground">{f.mode}</td>
                    <td className="py-0.5 text-muted-foreground">{f.description ?? ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )
    },
  },

  runReadOnlyQueryTool: {
    input: (args) => (
      <div className="space-y-1">
        <pre className="overflow-x-auto whitespace-pre-wrap break-all rounded bg-muted px-2 py-1.5 text-xs">
          {String(args.query ?? '')}
        </pre>
        <span className="text-muted-foreground text-xs">
          offset {String(args.startIndex ?? 0)}, max {String(args.maxResults ?? '')} rows
        </span>
      </div>
    ),
    result: (result) => {
      const { rows, totalRows } = result as { rows: Array<Record<string, unknown>>; totalRows: number }
      if (!Array.isArray(rows) || rows.length === 0)
        return <span className="text-muted-foreground">No rows returned</span>
      const columns = Object.keys(rows[0])
      return (
        <div className="space-y-1.5">
          <p className="text-muted-foreground text-xs">{totalRows} row{totalRows !== 1 ? 's' : ''}</p>
          <div className="overflow-x-auto">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="border-b border-border">
                  {columns.map((col) => (
                    <th key={col} className="pb-1 pr-3 text-left font-medium text-muted-foreground whitespace-nowrap">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  // eslint-disable-next-line react/no-array-index-key -- query result rows have no stable ID
                  <tr key={i} className="border-b border-border/50 last:border-0">
                    {columns.map((col) => (
                      <td key={col} className="py-0.5 pr-3 font-mono whitespace-nowrap">
                        {row[col] === null || row[col] === undefined
                          ? <span className="text-muted-foreground italic">null</span>
                          : String(row[col])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )
    },
  },

  runWriteQueryTool: {
    input: (args) => (
      <pre className="overflow-x-auto whitespace-pre-wrap break-all rounded bg-muted px-2 py-1.5 text-xs">
        {String(args.query ?? '')}
      </pre>
    ),
    result: (result) => {
      if (typeof result === 'string') return <p className="text-destructive text-xs">{result}</p>
      const r = result as { affectedRows?: number; message?: string; error?: string }
      if (r?.error) return <ToolError message={r.error} />
      return (
        <div className="space-y-0.5 font-sans">
          <p>{r?.message ?? 'Query executed successfully'}</p>
          {r?.affectedRows !== undefined && (
            <p className="text-muted-foreground text-xs">{r.affectedRows} row{r.affectedRows !== 1 ? 's' : ''} affected</p>
          )}
        </div>
      )
    },
  },
}

// 'run-write-query' is a legacy alias for 'runWriteQueryTool'
TOOL_RENDERERS['run-write-query'] = TOOL_RENDERERS['runWriteQueryTool']

// 'createVisualizationTool' is intentionally absent from TOOL_RENDERERS:
// it requires a hook (useReportQuery) and is handled by VisualizationToolResult below.

// ── Lookup helpers ─────────────────────────────────────────────────────────────

function getToolInput(toolName: string, args: Record<string, unknown>): React.ReactNode {
  return TOOL_RENDERERS[toolName]?.input?.(args) ?? null
}

function getToolResult(toolName: string, result: unknown): React.ReactNode {
  const error = getErrorMessage(result)
  if (error) return <ToolError message={error} />

  const renderer = TOOL_RENDERERS[toolName]?.result
  if (renderer) return renderer(result)

  return (
    <pre className="overflow-x-auto whitespace-pre-wrap break-all">
      {typeof result === 'string' ? result : JSON.stringify(result, null, 2)}
    </pre>
  )
}

// ── Visualization tool (needs a hook, so it's a real component) ────────────────

function VisualizationToolResult({ args, result }: { args: Record<string, unknown>; result: unknown }) {
  const config: ReportConfig = {
    title: (args.title as string) ?? '',
    dataSource: (args.dataSource as SelectedTable) ?? null,
    dimension: (args.dimension as string) ?? null,
    dimensionGranularity: (args.dimensionGranularity as DimensionGranularity) ?? null,
    groupBy: (args.groupBy as string) ?? null,
    groupByGranularity: (args.groupByGranularity as DimensionGranularity) ?? null,
    groupByIncludeEmpty: (args.groupByIncludeEmpty as boolean) ?? false,
    metrics: (args.metrics as Metric[]) ?? [],
    orderBy: (args.orderBy as OrderByConfig) ?? null,
    visualization: (args.visualization as VisualizationConfig) ?? null,
    filters: (args.filters as ReportFilter[]) ?? [],
  }

  const { data, isFetching, isError } = useReportQuery(config)

  const errorMsg = getErrorMessage(result)
  if (errorMsg) {
    return (
      <div className="p-1">
        <ToolError message={errorMsg} />
      </div>
    )
  }

  const r = result as { valid: boolean; errors?: string[] } | undefined
  if (r && !r.valid) {
    return (
      <div className="space-y-1 p-1">
        <p className="text-destructive font-medium text-xs">Invalid configuration</p>
        {r.errors?.map((e, i) => (
          // eslint-disable-next-line react/no-array-index-key -- validation errors are short static lists
          <p key={i} className="text-destructive text-xs">{e}</p>
        ))}
      </div>
    )
  }

  return (
    <div className="flex h-85 justify-center items-center">
      <ReportChart config={config} data={data} isFetching={isFetching} isError={isError} bgColor="transparent" />
    </div>
  )
}

// ── ToolCallItem ───────────────────────────────────────────────────────────────

interface ToolCallItemProps {
  toolCall: ToolCall
  onApprove?: () => void
  onDecline?: () => void
}

function ToolCallItem({ toolCall, onApprove, onDecline }: ToolCallItemProps) {
  const isVisualization = toolCall.toolName === 'createVisualizationTool'
  const isPendingApproval = toolCall.status === 'pending-approval'
  const inputNode = getToolInput(toolCall.toolName, toolCall.args ?? {})
  const hasDetails = isVisualization || inputNode !== null || toolCall.result !== undefined || isPendingApproval
  const hasError = toolCall.status === 'error'

  return (
    <div>
      <div
        className={cn(
          'flex w-full items-center gap-2 rounded-md px-2.5 py-2.5 text-xs',
          'bg-muted/40 text-muted-foreground border-x border-t',
          hasDetails ? 'rounded-b-none' : '',
        )}
      >
        {toolCall.status === 'running' ? (
          <span className="h-3 w-3 rounded-full border-2 border-current border-t-transparent animate-spin shrink-0" />
        ) : isPendingApproval ? (
          <OctagonPause className="h-3 w-3 shrink-0" aria-hidden />
        ) : hasError ? (
          <X className="h-3 w-3 shrink-0 text-destructive" aria-hidden />
        ) : (
          <Check className="h-3 w-3 shrink-0 text-green-600" aria-hidden />
        )}
        <span className="font-mono font-medium">{toolCall.toolName}</span>
        {isPendingApproval && (
          <span className="ml-1 text-[10px] font-sans font-medium uppercase tracking-wide opacity-70">
            awaiting approval
          </span>
        )}
      </div>
      {hasDetails && (
        <>
          {isVisualization ? (
            <div className="rounded-b-md bg-muted/40 text-xs font-mono border">
              <VisualizationToolResult args={toolCall.args ?? {}} result={toolCall.result} />
            </div>
          ) : (
            <div className="rounded-b-md bg-muted/40 px-2.5 py-2 text-xs font-mono border">
              {inputNode !== null && (
                <>
                  <p className="mb-1 text-muted-foreground font-sans font-medium text-xs uppercase tracking-wide">
                    Input
                  </p>
                  <div className="font-sans py-2">{inputNode}</div>
                </>
              )}
              {isPendingApproval && (
                <div className="flex justify-end gap-2 mt-2 font-sans">
                  <button
                    onClick={onApprove}
                    className="rounded px-3 py-1 text-xs font-medium bg-green-600 text-white hover:bg-green-700 transition-colors"
                  >
                    Approve
                  </button>
                  <button
                    onClick={onDecline}
                    className="rounded px-3 py-1 text-xs font-medium bg-muted text-muted-foreground hover:bg-muted/80 border border-border transition-colors"
                  >
                    Decline
                  </button>
                </div>
              )}
              {toolCall.result !== undefined && (
                <>
                  <p className={cn('mb-1 mt-2 text-muted-foreground font-sans font-medium text-xs uppercase tracking-wide', inputNode !== null && 'mt-2')}>
                    Result
                  </p>
                  <div className="font-sans py-2">
                    {hasError
                      ? <p className="text-destructive text-xs">{getErrorMessage(toolCall.result) ?? 'Declined'}</p>
                      : getToolResult(toolCall.toolName, toolCall.result)
                    }
                  </div>
                </>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ── ToolCallDisplay (public export) ───────────────────────────────────────────

interface ToolCallDisplayProps {
  toolCalls: ToolCall[]
  onApprove?: () => void
  onDecline?: () => void
}

export function ToolCallDisplay({ toolCalls, onApprove, onDecline }: ToolCallDisplayProps) {
  if (toolCalls.length === 0) return null
  return (
    <div className="my-3 flex flex-col gap-1.5">
      {toolCalls.map((tc) => (
        <ToolCallItem
          key={tc.toolCallId}
          toolCall={tc}
          onApprove={tc.status === 'pending-approval' ? onApprove : undefined}
          onDecline={tc.status === 'pending-approval' ? onDecline : undefined}
        />
      ))}
    </div>
  )
}
