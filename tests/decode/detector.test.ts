import { describe, it, expect } from 'vitest';
import { HeuristicDetector } from '../../src/decode/detector.js';
import * as F from '../fixtures/payloads.js';

function makePayload(b64: string) {
  const bytes = Buffer.from(b64, 'base64');
  let text: string | null;
  try {
    text = bytes.toString('utf-8');
  } catch {
    text = null;
  }
  let json: unknown | null = null;
  if (text) {
    try { json = JSON.parse(text); } catch { json = null; }
  }
  return { base64: b64, bytes, text, json };
}

const detector = new HeuristicDetector();

describe('HeuristicDetector — p-field standards', () => {
  it('detects HCS-1', () => {
    expect(detector.detect(makePayload(F.HCS1_INSCRIPTION))?.standard).toBe('HCS-1');
    expect(detector.detect(makePayload(F.HCS1_INSCRIPTION))?.confidence).toBe('medium');
  });

  it('detects HCS-2', () => {
    expect(detector.detect(makePayload(F.HCS2_REGISTER))?.standard).toBe('HCS-2');
  });

  it('detects HCS-3', () => {
    expect(detector.detect(makePayload(F.HCS3_FILE_REF))?.standard).toBe('HCS-3');
  });

  it('detects HCS-5', () => {
    expect(detector.detect(makePayload(F.HCS5_REGISTER))?.standard).toBe('HCS-5');
  });

  it('detects HCS-6', () => {
    expect(detector.detect(makePayload(F.HCS6_REGISTER))?.standard).toBe('HCS-6');
  });

  it('detects HCS-7', () => {
    expect(detector.detect(makePayload(F.HCS7_SMART))?.standard).toBe('HCS-7');
  });

  it('detects HCS-10', () => {
    expect(detector.detect(makePayload(F.HCS10_REGISTER))?.standard).toBe('HCS-10');
  });

  it('detects HCS-20', () => {
    expect(detector.detect(makePayload(F.HCS20_DEPLOY))?.standard).toBe('HCS-20');
  });

  it('detects HCS-27', () => {
    expect(detector.detect(makePayload(F.HCS27_REGISTER))?.standard).toBe('HCS-27');
  });
});

describe('HeuristicDetector — HCS-11 (shape-based, all types)', () => {
  it('detects type 0 (personal)', () => {
    const match = detector.detect(makePayload(F.HCS11_PERSONAL));
    expect(match?.standard).toBe('HCS-11');
    expect(match?.label).toContain('Personal');
  });

  it('detects type 1 (AI agent)', () => {
    expect(detector.detect(makePayload(F.HCS11_AI_AGENT))?.label).toContain('AI Agent');
  });

  it('detects type 2 (MCP server)', () => {
    expect(detector.detect(makePayload(F.HCS11_MCP_SERVER))?.label).toContain('MCP Server');
  });

  it('detects type 3 (flora)', () => {
    expect(detector.detect(makePayload(F.HCS11_FLORA))?.label).toContain('Flora');
  });

  it('detects type as string (coercion)', () => {
    // Some payloads in the wild may have type as string "1"
    expect(detector.detect(makePayload(F.HCS11_STRING_TYPE))?.standard).toBe('HCS-11');
  });
});

describe('HeuristicDetector — non-matches', () => {
  it('returns null for plain text', () => {
    expect(detector.detect(makePayload(F.PLAIN_TEXT))).toBeNull();
  });

  it('returns null for binary', () => {
    const payload = makePayload(F.BINARY_PAYLOAD);
    // Override text to null to simulate binary
    expect(detector.detect({ ...payload, json: null, text: null })).toBeNull();
  });

  it('returns null for unknown p field', () => {
    expect(detector.detect(makePayload(F.UNKNOWN_P_FIELD))).toBeNull();
  });

  it('returns null for plain JSON without standard match', () => {
    expect(detector.detect(makePayload(F.CUSTOM_JSON_PLAIN))).toBeNull();
  });
});
