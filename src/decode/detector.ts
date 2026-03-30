/**
 * HeuristicDetector — pattern-based detection without schema validation.
 *
 * Checks field presence/values (primarily the `p` field) to identify HCS standards.
 * Returns confidence: 'medium' for known patterns, 'low' for weak matches.
 *
 * Implements the Detector interface for use in the pipeline.
 */

import type { Detector, DecodedPayload, DetectorMatch } from './types.js';

export class HeuristicDetector implements Detector {
  readonly name = 'heuristic' as const;

  detect(payload: DecodedPayload): DetectorMatch | null {
    if (payload.json === null) return null;
    if (typeof payload.json !== 'object' || Array.isArray(payload.json)) return null;

    const obj = payload.json as Record<string, unknown>;

    // HCS-1: inscription with file chunking
    if (obj['p'] === 'hcs-1' || obj['standard'] === 'hcs-1') {
      return {
        standard: 'HCS-1',
        label: 'HCS-1 Inscription',
        summary: summarize(obj, ['o', 'op', 'f', 'm', 'chunk']),
        confidence: 'medium',
        extractedFields: pick(obj, ['o', 'op', 'f', 'm']),
        warnings: [],
      };
    }

    // HCS-2: topic registry
    if (obj['p'] === 'hcs-2') {
      const op = str(obj['op']);
      const memo = str(obj['m'] ?? obj['memo']);
      return {
        standard: 'HCS-2',
        label: 'HCS-2 Registry',
        summary: `op=${op}${memo ? `  memo="${memo}"` : ''}`,
        confidence: 'medium',
        extractedFields: pick(obj, ['op', 't_id', 'uid', 'm', 'memo']),
        warnings: [],
      };
    }

    // HCS-3: recursive file loading
    if (obj['p'] === 'hcs-3') {
      return {
        standard: 'HCS-3',
        label: 'HCS-3 File Ref',
        summary: 'recursive file reference',
        confidence: 'medium',
        extractedFields: pick(obj, ['op', 'data', 'refs']),
        warnings: [],
      };
    }

    // HCS-5: Hashinal NFT registry (same shape as HCS-2)
    if (obj['p'] === 'hcs-5') {
      const op = str(obj['op']);
      return {
        standard: 'HCS-5',
        label: 'HCS-5 Hashinal Registry',
        summary: `op=${op}`,
        confidence: 'medium',
        extractedFields: pick(obj, ['op', 't_id', 'uid', 'm']),
        warnings: [],
      };
    }

    // HCS-6: dynamic Hashinals
    if (obj['p'] === 'hcs-6') {
      const op = str(obj['op']);
      return {
        standard: 'HCS-6',
        label: 'HCS-6 Dynamic Hashinal',
        summary: `op=${op}`,
        confidence: 'medium',
        extractedFields: pick(obj, ['op', 't_id', 'uid', 'm']),
        warnings: [],
      };
    }

    // HCS-7: smart Hashinals
    if (obj['p'] === 'hcs-7') {
      return {
        standard: 'HCS-7',
        label: 'HCS-7 Smart Hashinal',
        summary: 'smart hashinal',
        confidence: 'medium',
        extractedFields: pick(obj, ['op', 'data', 'tick']),
        warnings: [],
      };
    }

    // HCS-10: agent communication
    if (obj['p'] === 'hcs-10') {
      const op = str(obj['op']);
      return {
        standard: 'HCS-10',
        label: 'HCS-10 Agent Comms',
        summary: `op=${op}`,
        confidence: 'medium',
        extractedFields: pick(obj, ['op', 'operator_id', 'connection_id', 'm']),
        warnings: [],
      };
    }

    // HCS-11: profile (shape-based — no p field)
    // Fix: accept types 0 (personal), 1 (AI agent), 2 (MCP server), 3 (flora)
    const hcs11Type = obj['type'];
    const validTypes = [0, 1, 2, 3];
    if (
      obj['version'] !== undefined &&
      (typeof hcs11Type === 'number' || typeof hcs11Type === 'string') &&
      validTypes.includes(Number(hcs11Type)) &&
      obj['display_name'] !== undefined
    ) {
      const typeNum = Number(hcs11Type);
      const typeLabels: Record<number, string> = {
        0: 'Personal',
        1: 'AI Agent',
        2: 'MCP Server',
        3: 'Flora',
      };
      const typeLabel = typeLabels[typeNum] ?? `type=${typeNum}`;
      const name = str(obj['display_name']);
      return {
        standard: 'HCS-11',
        label: `HCS-11 Profile (${typeLabel})`,
        summary: `"${name}"`,
        confidence: 'medium',
        extractedFields: pick(obj, ['version', 'type', 'display_name', 'alias', 'bio']),
        warnings: [],
      };
    }

    // HCS-20: auditable points
    if (obj['p'] === 'hcs-20') {
      const op = str(obj['op']);
      const tick = str(obj['tick']);
      return {
        standard: 'HCS-20',
        label: 'HCS-20 Points',
        summary: `op=${op}  tick=${tick}`,
        confidence: 'medium',
        extractedFields: pick(obj, ['op', 'tick', 'amt', 'to', 'from', 'max']),
        warnings: [],
      };
    }

    // HCS-27: transparency logs
    if (obj['p'] === 'hcs-27') {
      return {
        standard: 'HCS-27',
        label: 'HCS-27 Transparency Log',
        summary: `op=${str(obj['op'])}`,
        confidence: 'medium',
        extractedFields: pick(obj, ['op', 'metadata', 'm']),
        warnings: [],
      };
    }

    // No heuristic match — let fallback handle it
    return null;
  }
}

// ---- Helpers ----

function str(v: unknown): string {
  return v != null ? String(v) : '';
}

function pick(obj: Record<string, unknown>, fields: string[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const f of fields) {
    if (obj[f] !== undefined) out[f] = obj[f];
  }
  return out;
}

function summarize(obj: Record<string, unknown>, fields: string[]): string {
  const parts: string[] = [];
  for (const f of fields) {
    if (obj[f] != null) parts.push(`${f}=${String(obj[f]).slice(0, 32)}`);
  }
  return parts.join('  ') || JSON.stringify(obj).slice(0, 80);
}

