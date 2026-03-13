import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api-client'
import type { DatasetInfo, SchemaField } from '@/types/api'

export function useDatasets() {
  return useQuery({
    queryKey: ['datasets'],
    queryFn: () =>
      apiFetch<{ data: DatasetInfo[] }>('/datasets').then((res) => res.data),
  })
}

export function useCreateDataset() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: { datasetId: string; location?: string; description?: string }) =>
      apiFetch('/datasets', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['datasets'] })
    },
  })
}

export function useCreateTable() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      datasetId,
      ...body
    }: {
      datasetId: string
      tableId: string
      schema: SchemaField[]
      description?: string
    }) =>
      apiFetch(`/datasets/${datasetId}/tables`, {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['datasets'] })
    },
  })
}

export function useExcelMeta() {
  return useMutation({
    mutationFn: ({ file }: { file: File }) => {
      const form = new FormData()
      form.append('file', file)
      return apiFetch<{ data: { sheets: string[] } }>(`/datasets/excel-meta`, {
        method: 'POST',
        body: form,
      }).then((res) => res.data)
    },
  })
}

export function useCreateTableFromFile() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      datasetId,
      file,
      tableId,
      fileType,
      description,
      sheet,
      startRow,
    }: {
      datasetId: string
      file: File
      tableId: string
      fileType: 'csv' | 'excel' | 'json'
      description?: string
      sheet?: string
      startRow?: number
    }) => {
      const form = new FormData()
      form.append('file', file)
      form.append('tableId', tableId)
      form.append('fileType', fileType)
      if (description) form.append('description', description)
      if (sheet) form.append('sheet', sheet)
      if (startRow !== undefined) form.append('startRow', String(startRow))
      return apiFetch<{ tableId: string; rowCount: number }>(
        `/datasets/${datasetId}/tables/from-file`,
        { method: 'POST', body: form },
      )
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['datasets'] })
    },
  })
}
