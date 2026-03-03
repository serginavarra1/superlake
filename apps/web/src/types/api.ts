import type { ReportConfig } from '@/contexts/report-builder-context'

interface BaseWidget {
  id: string
  dashboardId: string
  x: number
  y: number
  w: number
  h: number
  createdAt: string
  updatedAt: string
}

export interface ReportWidget extends BaseWidget {
  type: 'report'
  config: ReportConfig
}

export type DashboardWidget = ReportWidget

export interface Dashboard {
  id: string
  title: string
  widgets: DashboardWidget[]
  createdAt: string
  updatedAt: string
}

export type GcpStatus =
  | 'pending'
  | 'creating'
  | 'active'
  | 'failed'
  | 'deleting'
  | 'delete_failed'

export interface Organization {
  id: string
  clerkOrgId: string
  gcpProjectId: string | null
  gcpStatus: GcpStatus
  gcpError: string | null
  createdAt: string
  updatedAt: string
}

export interface ApiError {
  message: string
  statusCode: number
  error?: string
}

export interface TableInfo {
  tableId: string
  type: string
}

export interface DatasetInfo {
  datasetId: string
  tables: TableInfo[]
}

export interface SchemaField {
  name: string
  type: string
  mode: string
  description?: string
  fields?: SchemaField[]
}

export interface TableDetails {
  tableId: string
  datasetId: string
  type: string
  description?: string
  schema: SchemaField[]
  rowCount: number | null
  sizeBytes: number | null
  createdAt: string | null
  lastModifiedAt: string | null
  location: string | null
  partitioning?: {
    type: string
    field?: string
    requireFilter: boolean
  }
  clustering?: {
    fields: string[]
  }
  viewQuery?: string
}