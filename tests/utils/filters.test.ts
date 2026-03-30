import { describe, it, expect } from 'vitest';
import { matchesFilters, parseFilterOptions, hasFilters } from '../../src/utils/filters.js';
import { decode } from '../../src/decode/pipeline.js';
import * as F from '../fixtures/payloads.js';

function makeResult(b64: string) {
  return decode(b64);
}

describe('parseFilterOptions', () => {
  it('extracts standard filter', () => {
    const opts = parseFilterOptions({ filterStandard: 'HCS-10' });
    expect(opts.standard).toBe('HCS-10');
  });

  it('extracts payer filter', () => {
    const opts = parseFilterOptions({ filterPayer: '0.0.12345' });
    expect(opts.payer).toBe('0.0.12345');
  });

  it('extracts text filter', () => {
    const opts = parseFilterOptions({ filterText: 'register' });
    expect(opts.text).toBe('register');
  });

  it('extracts confidence filter (valid values)', () => {
    expect(parseFilterOptions({ filterConfidence: 'high' }).confidence).toBe('high');
    expect(parseFilterOptions({ filterConfidence: 'medium' }).confidence).toBe('medium');
    expect(parseFilterOptions({ filterConfidence: 'low' }).confidence).toBe('low');
  });

  it('ignores invalid confidence value', () => {
    const opts = parseFilterOptions({ filterConfidence: 'extreme' });
    expect(opts.confidence).toBeUndefined();
  });

  it('returns empty object when no filters provided', () => {
    expect(parseFilterOptions({})).toEqual({});
  });
});

describe('hasFilters', () => {
  it('returns false for empty filter object', () => {
    expect(hasFilters({})).toBe(false);
  });

  it('returns true when any filter is set', () => {
    expect(hasFilters({ standard: 'HCS-10' })).toBe(true);
    expect(hasFilters({ payer: '0.0.12345' })).toBe(true);
  });
});

describe('matchesFilters — standard filter', () => {
  it('matches exact standard (case-insensitive)', () => {
    const result = makeResult(F.HCS10_REGISTER);
    expect(matchesFilters(result, '0.0.12345', { standard: 'HCS-10' })).toBe(true);
    expect(matchesFilters(result, '0.0.12345', { standard: 'hcs-10' })).toBe(true);
  });

  it('rejects non-matching standard', () => {
    const result = makeResult(F.HCS10_REGISTER);
    expect(matchesFilters(result, '0.0.12345', { standard: 'HCS-2' })).toBe(false);
  });
});

describe('matchesFilters — payer filter', () => {
  it('matches payer by substring', () => {
    const result = makeResult(F.HCS10_REGISTER);
    expect(matchesFilters(result, '0.0.999999', { payer: '0.0.999999' })).toBe(true);
    expect(matchesFilters(result, '0.0.999999', { payer: '999999' })).toBe(true);
  });

  it('rejects non-matching payer', () => {
    const result = makeResult(F.HCS10_REGISTER);
    expect(matchesFilters(result, '0.0.999999', { payer: '0.0.111111' })).toBe(false);
  });
});

describe('matchesFilters — text filter', () => {
  it('matches text in decoded content', () => {
    const result = makeResult(F.HCS10_REGISTER);
    expect(matchesFilters(result, '0.0.12345', { text: 'register' })).toBe(true);
  });

  it('rejects non-matching text', () => {
    const result = makeResult(F.HCS10_REGISTER);
    expect(matchesFilters(result, '0.0.12345', { text: 'xyznotfound' })).toBe(false);
  });

  it('search is case-insensitive', () => {
    const result = makeResult(F.HCS10_REGISTER);
    expect(matchesFilters(result, '0.0.12345', { text: 'REGISTER' })).toBe(true);
  });
});

describe('matchesFilters — confidence filter', () => {
  it('matches validated → high confidence', () => {
    const result = makeResult(F.HCS10_REGISTER);
    expect(result.confidence).toBe('high');
    expect(matchesFilters(result, '0.0.12345', { confidence: 'high' })).toBe(true);
    expect(matchesFilters(result, '0.0.12345', { confidence: 'low' })).toBe(false);
  });

  it('matches fallback → low confidence', () => {
    const result = makeResult(F.CUSTOM_JSON_PLAIN);
    expect(result.confidence).toBe('low');
    expect(matchesFilters(result, '0.0.12345', { confidence: 'low' })).toBe(true);
    expect(matchesFilters(result, '0.0.12345', { confidence: 'high' })).toBe(false);
  });
});

describe('matchesFilters — multiple filters (AND logic)', () => {
  it('passes only when all filters match', () => {
    const result = makeResult(F.HCS10_REGISTER);
    // All match
    expect(matchesFilters(result, '0.0.999', { standard: 'HCS-10', confidence: 'high' })).toBe(true);
    // standard matches but confidence doesn't
    expect(matchesFilters(result, '0.0.999', { standard: 'HCS-10', confidence: 'low' })).toBe(false);
    // confidence matches but standard doesn't
    expect(matchesFilters(result, '0.0.999', { standard: 'HCS-2', confidence: 'high' })).toBe(false);
  });
});

describe('matchesFilters — no filters', () => {
  it('passes everything when no filters set', () => {
    const result = makeResult(F.HCS10_REGISTER);
    expect(matchesFilters(result, '0.0.12345', {})).toBe(true);
  });
});
