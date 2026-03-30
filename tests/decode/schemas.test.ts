import { describe, it, expect } from 'vitest';
import { tryValidate } from '../../src/decode/schemas.js';
import * as F from '../fixtures/payloads.js';

function json(b64: string): unknown {
  try {
    return JSON.parse(Buffer.from(b64, 'base64').toString('utf-8'));
  } catch {
    return null;
  }
}

describe('tryValidate — HCS-1', () => {
  it('detects p=hcs-1', () => {
    const result = tryValidate(json(F.HCS1_INSCRIPTION));
    expect(result).not.toBeNull();
    expect(result!.standard).toBe('HCS-1');
    expect(result!.confidence).toBe('high');
  });

  it('detects standard=hcs-1 (alternate field)', () => {
    const result = tryValidate(json(F.HCS1_ALT_STANDARD_FIELD));
    expect(result).not.toBeNull();
    expect(result!.standard).toBe('HCS-1');
  });
});

describe('tryValidate — HCS-2', () => {
  it('detects register op', () => {
    const result = tryValidate(json(F.HCS2_REGISTER));
    expect(result?.standard).toBe('HCS-2');
    expect(result?.confidence).toBe('high');
    expect(result?.extractedFields['op']).toBe('register');
  });

  it('detects update op', () => {
    expect(tryValidate(json(F.HCS2_UPDATE))?.standard).toBe('HCS-2');
  });

  it('detects delete op', () => {
    expect(tryValidate(json(F.HCS2_DELETE))?.standard).toBe('HCS-2');
  });

  it('detects migrate op', () => {
    expect(tryValidate(json(F.HCS2_MIGRATE))?.standard).toBe('HCS-2');
  });
});

describe('tryValidate — HCS-3', () => {
  it('detects p=hcs-3', () => {
    expect(tryValidate(json(F.HCS3_FILE_REF))?.standard).toBe('HCS-3');
  });
});

describe('tryValidate — HCS-5', () => {
  it('detects p=hcs-5', () => {
    expect(tryValidate(json(F.HCS5_REGISTER))?.standard).toBe('HCS-5');
  });
});

describe('tryValidate — HCS-6', () => {
  it('detects p=hcs-6', () => {
    expect(tryValidate(json(F.HCS6_REGISTER))?.standard).toBe('HCS-6');
  });
});

describe('tryValidate — HCS-7', () => {
  it('detects p=hcs-7', () => {
    expect(tryValidate(json(F.HCS7_SMART))?.standard).toBe('HCS-7');
  });
});

describe('tryValidate — HCS-10', () => {
  it('detects register op', () => {
    const result = tryValidate(json(F.HCS10_REGISTER));
    expect(result?.standard).toBe('HCS-10');
    expect(result?.confidence).toBe('high');
  });

  it('detects message op', () => {
    expect(tryValidate(json(F.HCS10_MESSAGE))?.standard).toBe('HCS-10');
  });

  it('passes through extra unknown fields', () => {
    // Schema should not reject messages with extra fields
    expect(tryValidate(json(F.HCS10_WITH_EXTRA_FIELDS))?.standard).toBe('HCS-10');
  });
});

describe('tryValidate — HCS-11', () => {
  it('detects type 0 (personal)', () => {
    const result = tryValidate(json(F.HCS11_PERSONAL));
    expect(result?.standard).toBe('HCS-11');
    expect(result?.label).toContain('Personal');
  });

  it('detects type 1 (AI agent)', () => {
    const result = tryValidate(json(F.HCS11_AI_AGENT));
    expect(result?.standard).toBe('HCS-11');
    expect(result?.label).toContain('AI Agent');
  });

  it('detects type 2 (MCP server)', () => {
    const result = tryValidate(json(F.HCS11_MCP_SERVER));
    expect(result?.standard).toBe('HCS-11');
    expect(result?.label).toContain('MCP Server');
  });

  it('detects type 3 (flora)', () => {
    const result = tryValidate(json(F.HCS11_FLORA));
    expect(result?.standard).toBe('HCS-11');
    expect(result?.label).toContain('Flora');
  });
});

describe('tryValidate — HCS-20', () => {
  it('detects deploy op', () => {
    const result = tryValidate(json(F.HCS20_DEPLOY));
    expect(result?.standard).toBe('HCS-20');
    expect(result?.extractedFields['tick']).toBe('MYPTS');
  });

  it('detects mint op', () => {
    expect(tryValidate(json(F.HCS20_MINT))?.standard).toBe('HCS-20');
  });

  it('detects transfer op', () => {
    expect(tryValidate(json(F.HCS20_TRANSFER))?.standard).toBe('HCS-20');
  });
});

describe('tryValidate — HCS-27', () => {
  it('detects register op', () => {
    expect(tryValidate(json(F.HCS27_REGISTER))?.standard).toBe('HCS-27');
  });
});

describe('tryValidate — non-matching inputs', () => {
  it('returns null for plain text (not JSON)', () => {
    expect(tryValidate('not an object')).toBeNull();
  });

  it('returns null for null', () => {
    expect(tryValidate(null)).toBeNull();
  });

  it('returns null for array', () => {
    expect(tryValidate([])).toBeNull();
  });

  it('returns null for unknown p field', () => {
    expect(tryValidate(json(F.UNKNOWN_P_FIELD))).toBeNull();
  });

  it('returns null for plain JSON without standard match', () => {
    expect(tryValidate(json(F.CUSTOM_JSON_PLAIN))).toBeNull();
  });
});
