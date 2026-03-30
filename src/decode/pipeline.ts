/**
 * Decoder pipeline: validated → heuristic → fallback
 *
 * Each stage implements the Detector interface. The pipeline tries each in order
 * and returns on the first match. The fallback stage always matches.
 *
 * To add a new detection source (e.g. SDK adapter), implement Detector and insert
 * it before the heuristic stage.
 */

import type { DecodeResult, DecodedPayload, Detector, ContentType } from './types.js';
import { tryValidate } from './schemas.js';
import { HeuristicDetector } from './detector.js';

// ---- Validated detector (Zod schemas) ----

const validatedDetector: Detector = {
  name: 'validated',
  detect(payload) {
    if (payload.json === null) return null;
    return tryValidate(payload.json);
  },
};

// ---- Fallback detector — always matches ----

const fallbackDetector: Detector = {
  name: 'fallback',
  detect(payload) {
    if (payload.text === null) {
      return {
        standard: 'BINARY',
        label: 'Binary',
        summary: '(binary payload)',
        confidence: 'low',
        extractedFields: {},
        warnings: [],
      };
    }
    if (payload.json === null) {
      return {
        standard: 'UNKNOWN',
        label: 'Plain text',
        summary: payload.text.slice(0, 80),
        confidence: 'low',
        extractedFields: {},
        warnings: [],
      };
    }
    // Valid JSON that nothing else matched
    const obj = payload.json as Record<string, unknown>;
    const typeStr = String(obj['type'] ?? obj['p'] ?? '');
    return {
      standard: 'CUSTOM_JSON',
      label: typeStr ? `JSON (${typeStr})` : 'JSON',
      summary: typeStr
        ? summarizeCustomJson(obj)
        : JSON.stringify(payload.json).slice(0, 80),
      confidence: 'low',
      extractedFields: {},
      warnings: [],
    };
  },
};

function summarizeCustomJson(obj: Record<string, unknown>): string {
  const commonFields = ['username', 'tweetId', 'account', 'id', 'type', 'p'];
  const parts: string[] = [];
  for (const f of commonFields) {
    if (obj[f] != null) parts.push(`${f}=${String(obj[f]).slice(0, 32)}`);
  }
  return parts.join('  ') || JSON.stringify(obj).slice(0, 80);
}

// ---- Pipeline stages (ordered: validated → heuristic → fallback) ----

const heuristicDetector = new HeuristicDetector();

const PIPELINE: Detector[] = [
  validatedDetector,
  heuristicDetector,
  fallbackDetector,
];

// ---- Payload normalization ----

function normalizePayload(base64: string): DecodedPayload {
  const bytes = Buffer.from(base64, 'base64');
  let text: string | null;
  try {
    text = bytes.toString('utf-8');
    // Sanity-check: if decoding produces replacement chars for binary data,
    // treat as binary. Heuristic: if >5% of chars are replacement char, it's binary.
    const replacements = (text.match(/\uFFFD/g) ?? []).length;
    if (replacements / text.length > 0.05) text = null;
  } catch {
    text = null;
  }

  let json: unknown | null = null;
  if (text !== null) {
    try {
      json = JSON.parse(text);
    } catch {
      json = null;
    }
  }

  return { base64, bytes, text, json };
}

// ---- Content type derivation ----

function contentType(payload: DecodedPayload): ContentType {
  if (payload.text === null) return 'binary';
  if (payload.json !== null) return 'json';
  if (payload.text !== null) return 'text';
  return 'unknown';
}

// ---- Public API ----

/**
 * Decode a base64-encoded HCS message payload.
 * Returns a fully-annotated DecodeResult with standard, provenance, and confidence.
 */
export function decode(base64: string): DecodeResult {
  const payload = normalizePayload(base64);
  const ct = contentType(payload);

  for (const detector of PIPELINE) {
    const match = detector.detect(payload);
    if (match !== null) {
      return {
        standard: match.standard,
        label: match.label,
        contentType: ct,
        raw: base64,
        decoded: payload.text ?? '(binary)',
        parsed: payload.json,
        summary: match.summary,
        detectedBy: detector.name,
        confidence: match.confidence,
        extractedFields: match.extractedFields,
        warnings: match.warnings,
      };
    }
  }

  // Should never reach here — fallback always matches
  throw new Error('Pipeline exhausted without match — this is a bug');
}

