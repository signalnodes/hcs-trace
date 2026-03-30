/**
 * Minimal Zod schemas for HCS standard detection.
 *
 * Validates discriminators and key structural fields only — not full spec compliance.
 * All object schemas use .passthrough() so unexpected fields don't cause false negatives.
 * Goal: identify a standard confidently, not enforce its complete specification.
 */

import { z } from 'zod';
import type { HcsStandard, DetectorMatch } from './types.js';

// HCS-1: Inscription / file chunking
// Discriminator: p === "hcs-1" or standard === "hcs-1"
const hcs1Schema = z.union([
  z.object({ p: z.literal('hcs-1') }).passthrough(),
  z.object({ standard: z.literal('hcs-1') }).passthrough(),
]);

// HCS-2: Topic registry
// Discriminator: p === "hcs-2" + op enum
const hcs2Schema = z.object({
  p: z.literal('hcs-2'),
  op: z.enum(['register', 'update', 'delete', 'migrate']),
}).passthrough();

// HCS-3: Recursive file loading
// Discriminator: p === "hcs-3"
const hcs3Schema = z.object({ p: z.literal('hcs-3') }).passthrough();

// HCS-5: Same message shape as HCS-2
// Discriminator: p === "hcs-5"
const hcs5Schema = z.object({
  p: z.literal('hcs-5'),
  op: z.enum(['register', 'update', 'delete', 'migrate']),
}).passthrough();

// HCS-6: Same shape as HCS-2, register op only
// Discriminator: p === "hcs-6"
const hcs6Schema = z.object({
  p: z.literal('hcs-6'),
  op: z.literal('register'),
}).passthrough();

// HCS-7: Smart Hashinals
// Discriminator: p === "hcs-7"
const hcs7Schema = z.object({ p: z.literal('hcs-7') }).passthrough();

// HCS-10: P2P Agent Communication
// Discriminator: p === "hcs-10" + op string
const hcs10Schema = z.object({
  p: z.literal('hcs-10'),
  op: z.string(),
}).passthrough();

// HCS-11: Decentralized Profile/Identity
// Discriminator: version number + type 0-3 + display_name string
// No p field — shape-based detection
const hcs11Schema = z.object({
  version: z.number(),
  type: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]),
  display_name: z.string(),
}).passthrough();

const HCS11_TYPE_LABELS: Record<number, string> = {
  0: 'Personal',
  1: 'AI Agent',
  2: 'MCP Server',
  3: 'Flora',
};

// HCS-20: Auditable Points system
// Discriminator: p === "hcs-20" + op enum + tick string
const hcs20Schema = z.object({
  p: z.literal('hcs-20'),
  op: z.enum(['deploy', 'mint', 'burn', 'transfer', 'register']),
  tick: z.string(),
}).passthrough();

// HCS-27: Transparency Logs
// Discriminator: p === "hcs-27" + op === "register" + metadata object
const hcs27Schema = z.object({
  p: z.literal('hcs-27'),
  op: z.literal('register'),
  metadata: z.union([z.object({}).passthrough(), z.string()]),
}).passthrough();

// ---- Validator functions ----

function extractFields(obj: Record<string, unknown>, fields: string[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const f of fields) {
    if (obj[f] !== undefined) out[f] = obj[f];
  }
  return out;
}

function shortVal(v: unknown): string {
  const s = typeof v === 'string' ? v : JSON.stringify(v);
  return s.length > 40 ? s.slice(0, 37) + '…' : s;
}

export function tryValidate(json: unknown): DetectorMatch | null {
  if (json === null || typeof json !== 'object' || Array.isArray(json)) return null;
  const obj = json as Record<string, unknown>;

  // HCS-1
  if (hcs1Schema.safeParse(obj).success) {
    const fields = extractFields(obj, ['o', 'op', 'f', 'm', 'chunk', 'data']);
    const parts = Object.entries(fields).map(([k, v]) => `${k}=${shortVal(v)}`);
    return {
      standard: 'HCS-1',
      label: 'HCS-1 Inscription',
      summary: parts.join('  ') || 'inscription',
      confidence: 'high',
      extractedFields: fields,
      warnings: [],
    };
  }

  // HCS-2
  const r2 = hcs2Schema.safeParse(obj);
  if (r2.success) {
    const op = String(obj.op ?? '');
    const memo = String(obj.m ?? obj.memo ?? '');
    const fields = extractFields(obj, ['op', 't_id', 'uid', 'm', 'memo', 'metadata']);
    return {
      standard: 'HCS-2',
      label: 'HCS-2 Registry',
      summary: `op=${op}${memo ? `  memo="${memo}"` : ''}`,
      confidence: 'high',
      extractedFields: fields,
      warnings: [],
    };
  }

  // HCS-3
  if (hcs3Schema.safeParse(obj).success) {
    const fields = extractFields(obj, ['op', 'data', 'refs']);
    return {
      standard: 'HCS-3',
      label: 'HCS-3 File Ref',
      summary: 'recursive file reference',
      confidence: 'high',
      extractedFields: fields,
      warnings: [],
    };
  }

  // HCS-5
  if (hcs5Schema.safeParse(obj).success) {
    const op = String(obj.op ?? '');
    const fields = extractFields(obj, ['op', 't_id', 'uid', 'm']);
    return {
      standard: 'HCS-5',
      label: 'HCS-5 Hashinal Registry',
      summary: `op=${op}`,
      confidence: 'high',
      extractedFields: fields,
      warnings: [],
    };
  }

  // HCS-6
  if (hcs6Schema.safeParse(obj).success) {
    const fields = extractFields(obj, ['op', 't_id', 'uid', 'm']);
    return {
      standard: 'HCS-6',
      label: 'HCS-6 Dynamic Hashinal',
      summary: 'op=register',
      confidence: 'high',
      extractedFields: fields,
      warnings: [],
    };
  }

  // HCS-7
  if (hcs7Schema.safeParse(obj).success) {
    const fields = extractFields(obj, ['op', 'data', 'tick']);
    return {
      standard: 'HCS-7',
      label: 'HCS-7 Smart Hashinal',
      summary: 'smart hashinal',
      confidence: 'high',
      extractedFields: fields,
      warnings: [],
    };
  }

  // HCS-10
  if (hcs10Schema.safeParse(obj).success) {
    const op = String(obj.op ?? '');
    const fields = extractFields(obj, ['op', 'operator_id', 'connection_id', 'm']);
    return {
      standard: 'HCS-10',
      label: 'HCS-10 Agent Comms',
      summary: `op=${op}`,
      confidence: 'high',
      extractedFields: fields,
      warnings: [],
    };
  }

  // HCS-20
  if (hcs20Schema.safeParse(obj).success) {
    const op = String(obj.op ?? '');
    const tick = String(obj.tick ?? '');
    const fields = extractFields(obj, ['op', 'tick', 'amt', 'to', 'from', 'max']);
    return {
      standard: 'HCS-20',
      label: 'HCS-20 Points',
      summary: `op=${op}  tick=${tick}`,
      confidence: 'high',
      extractedFields: fields,
      warnings: [],
    };
  }

  // HCS-27
  if (hcs27Schema.safeParse(obj).success) {
    const fields = extractFields(obj, ['op', 'metadata', 'metadata_digest', 'm']);
    return {
      standard: 'HCS-27',
      label: 'HCS-27 Transparency Log',
      summary: 'op=register',
      confidence: 'high',
      extractedFields: fields,
      warnings: [],
    };
  }

  // HCS-11 — shape-based (no p field), check last to avoid conflicts
  const r11 = hcs11Schema.safeParse(obj);
  if (r11.success) {
    const typeNum = obj.type as number;
    const typeLabel = HCS11_TYPE_LABELS[typeNum] ?? `type=${typeNum}`;
    const name = String(obj.display_name ?? '');
    const fields = extractFields(obj, ['version', 'type', 'display_name', 'alias', 'bio', 'socials']);
    return {
      standard: 'HCS-11',
      label: `HCS-11 Profile (${typeLabel})`,
      summary: `"${name}"`,
      confidence: 'high',
      extractedFields: fields,
      warnings: [],
    };
  }

  return null;
}

export { HCS11_TYPE_LABELS };
export type { HcsStandard };
