export interface TableInfo {
  tableId: string;
  type: string;
}

export interface DatasetInfo {
  datasetId: string;
  tables: TableInfo[];
}

export interface SchemaField {
  name: string;
  type: string;
  mode: string;
  description?: string;
  fields?: SchemaField[];
}

export interface TableDetails {
  tableId: string;
  datasetId: string;
  type: string;
  description?: string;
  schema: SchemaField[];
  rowCount: number | null;
  sizeBytes: number | null;
  createdAt: string | null;
  lastModifiedAt: string | null;
  location: string | null;
  partitioning?: {
    type: string;
    field?: string;
    requireFilter: boolean;
  };
  clustering?: {
    fields: string[];
  };
  viewQuery?: string;
}