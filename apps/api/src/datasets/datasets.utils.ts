import { parse as parseCsvSync } from 'csv-parse/sync';
import { SchemaField } from './datasets.types';

// Unicode letters, digits, underscore — safe for backtick-quoted column names; dots allowed for nested field paths
export const SAFE_COLUMN_RE = /^[\p{L}\p{N}_ ]+(?:\.[\p{L}\p{N}_ ]+)*$/u;
// Unicode letters, digits, underscore, hyphens, spaces — safe for backtick-quoted dataset/table identifiers
export const SAFE_IDENTIFIER_RE = /^[\p{L}\p{N}_ -]+$/u;

export const FILE_SIZE_LIMITS: Record<string, number> = {
  csv: 1 * 1024 * 1024 * 1024, // 1 GB — no in-memory parsing
  excel: 100 * 1024 * 1024,    // 100 MB — fully parsed in memory
  json: 100 * 1024 * 1024,     // 100 MB — fully parsed in memory
};

export function quoteColumn(column: string): string {
  return column.split('.').map((seg) => `\`${seg}\``).join('.');
}

export function mapFields(fields: any[]): SchemaField[] {
  return fields.map((f) => ({
    name: f.name,
    type: f.type,
    mode: f.mode ?? 'NULLABLE',
    description: f.description,
    fields: f.fields ? mapFields(f.fields) : undefined,
  }));
}

export function patchFieldDescriptions(
  fields: any[],
  descMap: Record<string, string>,
  prefix = '',
): any[] {
  return fields.map((f) => {
    const path = prefix ? `${prefix}.${f.name}` : f.name;
    const patched = { ...f };
    if (path in descMap) patched.description = descMap[path];
    if (f.fields) patched.fields = patchFieldDescriptions(f.fields, descMap, path);
    return patched;
  });
}

export function sanitizeColumnName(name: string): string {
  // Allow Unicode letters (incl. accents), digits, underscores, and spaces — same set as SAFE_COLUMN_RE
  let s = String(name).trim().replace(/[^\p{L}\p{N}_ ]/gu, '_');
  if (/^\d/u.test(s)) s = '_' + s;
  return s || '_col';
}

export function detectCsvDelimiter(buffer: Buffer): ',' | ';' | '\t' {
  const sample = buffer.subarray(0, 8192).toString('utf8');
  const lines = sample.split('\n').filter((l) => l.trim()).slice(0, 6);
  if (lines.length === 0) return ',';

  const candidates: Array<',' | ';' | '\t'> = [',', ';', '\t'];
  let bestDelimiter: ',' | ';' | '\t' = ',';
  let bestScore = -1;

  for (const delimiter of candidates) {
    try {
      const rows = parseCsvSync(lines.join('\n'), {
        delimiter,
        relax_column_count: true,
        skip_empty_lines: true,
      }) as string[][];

      if (rows.length === 0 || rows[0].length <= 1) continue;

      const expectedCols = rows[0].length;
      const consistent = rows.filter((r) => r.length === expectedCols).length;
      const score = (expectedCols - 1) * consistent;

      if (score > bestScore) {
        bestScore = score;
        bestDelimiter = delimiter;
      }
    } catch {
      // Parsing failed for this delimiter — skip
    }
  }

  return bestDelimiter;
}
