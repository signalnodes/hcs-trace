export type DetectionSource = 'validated' | 'heuristic' | 'fallback';
export type DetectionConfidence = 'high' | 'medium' | 'low';
export type ContentType = 'json' | 'text' | 'binary' | 'unknown';

export type HcsStandard =
  | 'HCS-1'
  | 'HCS-2'
  | 'HCS-3'
  | 'HCS-5'
  | 'HCS-6'
  | 'HCS-7'
  | 'HCS-10'
  | 'HCS-11'
  | 'HCS-20'
  | 'HCS-27'
  | 'CUSTOM_JSON'
  | 'BINARY'
  | 'UNKNOWN';

export interface DecodeResult {
  standard: HcsStandard;
  label: string;
  contentType: ContentType;
  raw: string;           // original base64
  decoded: string;       // utf-8 string or "(binary)"
  parsed: unknown;       // JSON object if applicable, null otherwise
  summary: string;       // one-line human description
  detectedBy: DetectionSource;
  confidence: DetectionConfidence;
  extractedFields: Record<string, unknown>;
  warnings: string[];
}

// Pre-parsed payload handed to each detector
export interface DecodedPayload {
  base64: string;
  bytes: Buffer;
  text: string | null;   // null if not valid UTF-8
  json: unknown | null;  // null if not valid JSON
}

export interface DetectorMatch {
  standard: HcsStandard;
  label: string;
  summary: string;
  confidence: DetectionConfidence;
  extractedFields: Record<string, unknown>;
  warnings: string[];
}

// Adapter interface — any detection source implements this
export interface Detector {
  name: DetectionSource;
  detect(payload: DecodedPayload): DetectorMatch | null;
}

// Enriched message = mirror envelope + decode result
export interface EnrichedMessage {
  topicId: string;
  sequenceNumber: number;
  consensusTimestamp: string;
  payerAccountId: string;
  chunkNumber: number;
  chunkTotal: number;
  rawBase64: string;
  rawBytesLength: number;
  decode: DecodeResult;
}
