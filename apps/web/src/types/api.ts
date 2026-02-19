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