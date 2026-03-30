import { describe, it, expect } from 'vitest';
import { decode } from '../../src/decode/pipeline.js';
import * as F from '../fixtures/payloads.js';

describe('decode() — pipeline layer precedence', () => {
  it('validated wins: HCS-10 with valid schema → detectedBy=validated, confidence=high', () => {
    const result = decode(F.HCS10_REGISTER);
    expect(result.detectedBy).toBe('validated');
    expect(result.confidence).toBe('high');
    expect(result.standard).toBe('HCS-10');
  });

  it('validated wins: HCS-2 register → detectedBy=validated', () => {
    const result = decode(F.HCS2_REGISTER);
    expect(result.detectedBy).toBe('validated');
    expect(result.standard).toBe('HCS-2');
  });

  it('validated wins: HCS-11 personal profile → detectedBy=validated', () => {
    const result = decode(F.HCS11_PERSONAL);
    expect(result.detectedBy).toBe('validated');
    expect(result.standard).toBe('HCS-11');
  });

  it('fallback: plain text → detectedBy=fallback, confidence=low, standard=UNKNOWN', () => {
    const result = decode(F.PLAIN_TEXT);
    expect(result.detectedBy).toBe('fallback');
    expect(result.confidence).toBe('low');
    expect(result.standard).toBe('UNKNOWN');
  });

  it('fallback: binary → detectedBy=fallback, standard=BINARY', () => {
    const result = decode(F.BINARY_PAYLOAD);
    expect(result.detectedBy).toBe('fallback');
    expect(result.standard).toBe('BINARY');
  });

  it('fallback: unknown p field → detectedBy=fallback, standard=CUSTOM_JSON', () => {
    const result = decode(F.UNKNOWN_P_FIELD);
    expect(result.detectedBy).toBe('fallback');
    expect(result.standard).toBe('CUSTOM_JSON');
  });

  it('fallback: plain JSON with no match → CUSTOM_JSON', () => {
    const result = decode(F.CUSTOM_JSON_PLAIN);
    expect(result.standard).toBe('CUSTOM_JSON');
    expect(result.confidence).toBe('low');
  });
});

describe('decode() — DecodeResult fields', () => {
  it('always includes raw base64', () => {
    const result = decode(F.HCS10_REGISTER);
    expect(result.raw).toBe(F.HCS10_REGISTER);
  });

  it('includes decoded UTF-8 string for JSON payloads', () => {
    const result = decode(F.HCS2_REGISTER);
    expect(result.decoded).toContain('hcs-2');
  });

  it('includes parsed JSON object', () => {
    const result = decode(F.HCS2_REGISTER);
    expect(result.parsed).not.toBeNull();
    expect(typeof result.parsed).toBe('object');
  });

  it('decoded is "(binary)" for binary payloads', () => {
    const result = decode(F.BINARY_PAYLOAD);
    expect(result.decoded).toBe('(binary)');
    expect(result.parsed).toBeNull();
  });

  it('contentType is "json" for JSON payloads', () => {
    expect(decode(F.HCS10_REGISTER).contentType).toBe('json');
    expect(decode(F.HCS2_REGISTER).contentType).toBe('json');
  });

  it('contentType is "text" for plain text', () => {
    expect(decode(F.PLAIN_TEXT).contentType).toBe('text');
  });

  it('contentType is "binary" for binary payloads', () => {
    expect(decode(F.BINARY_PAYLOAD).contentType).toBe('binary');
  });

  it('extractedFields are populated for known standards', () => {
    const result = decode(F.HCS10_REGISTER);
    expect(result.extractedFields).toHaveProperty('op');
  });

  it('warnings array is always present (may be empty)', () => {
    const result = decode(F.HCS10_REGISTER);
    expect(Array.isArray(result.warnings)).toBe(true);
  });
});

describe('decode() — standard coverage', () => {
  const cases: [string, string, string][] = [
    ['HCS-1', F.HCS1_INSCRIPTION, 'HCS-1'],
    ['HCS-2', F.HCS2_REGISTER, 'HCS-2'],
    ['HCS-3', F.HCS3_FILE_REF, 'HCS-3'],
    ['HCS-5', F.HCS5_REGISTER, 'HCS-5'],
    ['HCS-6', F.HCS6_REGISTER, 'HCS-6'],
    ['HCS-7', F.HCS7_SMART, 'HCS-7'],
    ['HCS-10', F.HCS10_REGISTER, 'HCS-10'],
    ['HCS-11 personal', F.HCS11_PERSONAL, 'HCS-11'],
    ['HCS-11 AI agent', F.HCS11_AI_AGENT, 'HCS-11'],
    ['HCS-11 MCP server', F.HCS11_MCP_SERVER, 'HCS-11'],
    ['HCS-11 flora', F.HCS11_FLORA, 'HCS-11'],
    ['HCS-20', F.HCS20_DEPLOY, 'HCS-20'],
    ['HCS-27', F.HCS27_REGISTER, 'HCS-27'],
  ];

  for (const [name, payload, expectedStandard] of cases) {
    it(`correctly identifies ${name}`, () => {
      const result = decode(payload);
      expect(result.standard).toBe(expectedStandard);
    });
  }
});
