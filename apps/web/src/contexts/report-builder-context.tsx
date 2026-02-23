import * as React from "react"

export interface SelectedTable {
  datasetId: string
  tableId: string
}

export type OperationType = "sum" | "avg" | "count" | "count_distinct" | "min" | "max"

export interface Metric {
  id: string
  operation: OperationType
  column: string | null
}

export type DatePart = "day" | "month" | "year"
export type DimensionGranularity = DatePart[]

export type OrderByDirection = "asc" | "desc"

export interface OrderByConfig {
  /** "dimension" | "group_by" | metric.id */
  target: string
  direction: OrderByDirection
}

export type VisualizationType = "bar" | "line" | "pie" | "single_metric"

export interface VisualizationConfig {
  type: VisualizationType
  stacked: boolean
}

export interface ReportConfig {
  title: string
  dataSource: SelectedTable | null
  dimension: string | null
  dimensionGranularity: DimensionGranularity | null
  groupBy: string | null
  groupByGranularity: DimensionGranularity | null
  groupByIncludeEmpty: boolean
  metrics: Metric[]
  orderBy: OrderByConfig | null
  visualization: VisualizationConfig | null
}

const INITIAL_CONFIG: ReportConfig = {
  title: "",
  dataSource: null,
  dimension: null,
  dimensionGranularity: null,
  groupBy: null,
  groupByGranularity: null,
  groupByIncludeEmpty: false,
  metrics: [],
  orderBy: null,
  visualization: null,
}

type Action =
  | { type: "SET_TITLE"; payload: string }
  | { type: "SET_DATA_SOURCE"; payload: SelectedTable | null }
  | { type: "SET_DIMENSION"; payload: string | null }
  | { type: "SET_DIMENSION_GRANULARITY"; payload: DimensionGranularity | null }
  | { type: "SET_GROUP_BY"; payload: string | null }
  | { type: "SET_GROUP_BY_GRANULARITY"; payload: DimensionGranularity | null }
  | { type: "SET_GROUP_BY_INCLUDE_EMPTY"; payload: boolean }
  | { type: "ADD_METRIC"; payload: Metric }
  | { type: "UPDATE_METRIC"; payload: { id: string; updates: Partial<Omit<Metric, "id">> } }
  | { type: "REMOVE_METRIC"; payload: string } // metric id
  | { type: "SET_ORDER_BY"; payload: OrderByConfig | null }
  | { type: "SET_VISUALIZATION"; payload: VisualizationConfig | null }

function reducer(state: ReportConfig, action: Action): ReportConfig {
  switch (action.type) {
    case "SET_TITLE":
      return { ...state, title: action.payload }
    case "SET_DATA_SOURCE":
      return { ...INITIAL_CONFIG, dataSource: action.payload }
    case "SET_DIMENSION": {
      const clearingDimension = action.payload === null
      const orderByInvalidated =
        clearingDimension &&
        (state.orderBy?.target === "dimension" || state.orderBy?.target === "group_by")
      const defaultOrderBy =
        !clearingDimension && state.orderBy === null
          ? { target: "dimension", direction: "asc" as OrderByDirection }
          : undefined
      return {
        ...state,
        dimension: action.payload,
        dimensionGranularity: null,
        ...(clearingDimension ? { groupBy: null, groupByGranularity: null, groupByIncludeEmpty: false } : {}),
        ...(orderByInvalidated ? { orderBy: null } : {}),
        ...(defaultOrderBy ? { orderBy: defaultOrderBy } : {}),
      }
    }
    case "SET_DIMENSION_GRANULARITY":
      return { ...state, dimensionGranularity: action.payload }
    case "SET_GROUP_BY": {
      const clearingGroupBy = action.payload === null
      const orderByInvalidated = clearingGroupBy && state.orderBy?.target === "group_by"
      return {
        ...state,
        groupBy: action.payload,
        groupByGranularity: null,
        groupByIncludeEmpty: false,
        ...(orderByInvalidated ? { orderBy: null } : {}),
      }
    }
    case "SET_GROUP_BY_GRANULARITY":
      return { ...state, groupByGranularity: action.payload }
    case "SET_GROUP_BY_INCLUDE_EMPTY":
      return { ...state, groupByIncludeEmpty: action.payload }
    case "ADD_METRIC":
      return { ...state, metrics: [...state.metrics, action.payload] }
    case "UPDATE_METRIC":
      return {
        ...state,
        metrics: state.metrics.map((m) =>
          m.id === action.payload.id ? { ...m, ...action.payload.updates } : m
        ),
      }
    case "REMOVE_METRIC": {
      const removedId = action.payload
      return {
        ...state,
        metrics: state.metrics.filter((m) => m.id !== removedId),
        orderBy: state.orderBy?.target === removedId ? null : state.orderBy,
      }
    }
    case "SET_ORDER_BY":
      return { ...state, orderBy: action.payload }
    case "SET_VISUALIZATION":
      return { ...state, visualization: action.payload }
  }
}

export interface ReportActions {
  setTitle: (title: string) => void
  setDataSource: (dataSource: SelectedTable | null) => void
  setDimension: (column: string | null) => void
  setDimensionGranularity: (granularity: DimensionGranularity | null) => void
  setGroupBy: (column: string | null) => void
  setGroupByGranularity: (granularity: DimensionGranularity | null) => void
  setGroupByIncludeEmpty: (value: boolean) => void
  addMetric: (metric: Metric) => void
  updateMetric: (id: string, updates: Partial<Omit<Metric, "id">>) => void
  removeMetric: (id: string) => void
  setOrderBy: (orderBy: OrderByConfig | null) => void
  setVisualization: (config: VisualizationConfig | null) => void
}

// Split into two contexts so components that only need actions don't re-render on config changes.
const ReportConfigContext = React.createContext<ReportConfig | null>(null)
const ReportActionsContext = React.createContext<ReportActions | null>(null)

export function ReportBuilderProvider({ children }: { children: React.ReactNode }) {
  const [config, dispatch] = React.useReducer(reducer, INITIAL_CONFIG)

  // Actions are stable — dispatch never changes, so this memo has no deps that ever change.
  const actions = React.useMemo<ReportActions>(
    () => ({
      setTitle: (title) => dispatch({ type: "SET_TITLE", payload: title }),
      setDataSource: (dataSource) => dispatch({ type: "SET_DATA_SOURCE", payload: dataSource }),
      setDimension: (column) => dispatch({ type: "SET_DIMENSION", payload: column }),
      setDimensionGranularity: (granularity) => dispatch({ type: "SET_DIMENSION_GRANULARITY", payload: granularity }),
      setGroupBy: (column) => dispatch({ type: "SET_GROUP_BY", payload: column }),
      setGroupByGranularity: (granularity) => dispatch({ type: "SET_GROUP_BY_GRANULARITY", payload: granularity }),
      setGroupByIncludeEmpty: (value) => dispatch({ type: "SET_GROUP_BY_INCLUDE_EMPTY", payload: value }),
      addMetric: (metric) => dispatch({ type: "ADD_METRIC", payload: metric }),
      updateMetric: (id, updates) => dispatch({ type: "UPDATE_METRIC", payload: { id, updates } }),
      removeMetric: (id) => dispatch({ type: "REMOVE_METRIC", payload: id }),
      setOrderBy: (orderBy) => dispatch({ type: "SET_ORDER_BY", payload: orderBy }),
      setVisualization: (config) => dispatch({ type: "SET_VISUALIZATION", payload: config }),
    }),
    [], // eslint-disable-line react-hooks/exhaustive-deps — dispatch is guaranteed stable
  )

  return (
    <ReportConfigContext value={config}>
      <ReportActionsContext value={actions}>
        {children}
      </ReportActionsContext>
    </ReportConfigContext>
  )
}

export function useReportConfig(): ReportConfig {
  const ctx = React.useContext(ReportConfigContext)
  if (!ctx) throw new Error("useReportConfig must be used inside ReportBuilderProvider")
  return ctx
}

export function useReportActions(): ReportActions {
  const ctx = React.useContext(ReportActionsContext)
  if (!ctx) throw new Error("useReportActions must be used inside ReportBuilderProvider")
  return ctx
}

/** Convenience hook that returns both config and actions. Prefer the split hooks when a component only needs one. */
export function useReportBuilder() {
  return { config: useReportConfig(), ...useReportActions() }
}
