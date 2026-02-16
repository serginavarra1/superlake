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