import type { DecodeResult, DetectionConfidence } from '../decode/types.js';

export interface FilterOptions {
  standard?: string;
  payer?: string;
  text?: string;
  confidence?: DetectionConfidence;
}

/**
 * Parse filter options from Commander opts object.
 * Returns only the options that were actually provided.
 */
export function parseFilterOptions(opts: Record<string, unknown>): FilterOptions {
  const filters: FilterOptions = {};
  if (typeof opts['filterStandard'] === 'string') filters.standard = opts['filterStandard'];
  if (typeof opts['filterPayer'] === 'string') filters.payer = opts['filterPayer'];
  if (typeof opts['filterText'] === 'string') filters.text = opts['filterText'];
  if (typeof opts['filterConfidence'] === 'string') {
    const c = opts['filterConfidence'] as string;
    if (c === 'high' || c === 'medium' || c === 'low') filters.confidence = c;
  }
  return filters;
}

export function hasFilters(filters: FilterOptions): boolean {
  return Object.keys(filters).length > 0;
}

/**
 * Test whether a decoded message + payer matches all active filters.
 * All specified filters must match (AND logic).
 */
export function matchesFilters(
  result: DecodeResult,
  payerAccountId: string,
  filters: FilterOptions,
): boolean {
  if (filters.standard !== undefined) {
    if (result.standard.toLowerCase() !== filters.standard.toLowerCase()) return false;
  }

  if (filters.payer !== undefined) {
    if (!payerAccountId.includes(filters.payer)) return false;
  }

  if (filters.text !== undefined) {
    const search = filters.text.toLowerCase();
    const inDecoded = result.decoded.toLowerCase().includes(search);
    const inSummary = result.summary.toLowerCase().includes(search);
    if (!inDecoded && !inSummary) return false;
  }

  if (filters.confidence !== undefined) {
    if (result.confidence !== filters.confidence) return false;
  }

  return true;
}
