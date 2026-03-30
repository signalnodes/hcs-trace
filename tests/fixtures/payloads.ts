/**
 * Test fixtures — base64-encoded HCS message payloads.
 *
 * Real payloads are used where known. Synthetic payloads fill gaps for standards
 * not yet observed in the wild, or for edge cases.
 *
 * To generate a base64 fixture from a JSON object:
 *   Buffer.from(JSON.stringify(obj)).toString('base64')
 */

function b64(obj: object): string {
  return Buffer.from(JSON.stringify(obj)).toString('base64');
}

function b64Text(text: string): string {
  return Buffer.from(text).toString('base64');
}

// ---- HCS-1: Inscription ----
// Synthetic — p field discriminator
export const HCS1_INSCRIPTION = b64({
  p: 'hcs-1',
  op: 'register',
  f: 'index.html',
  m: 'My dApp entry',
});

export const HCS1_ALT_STANDARD_FIELD = b64({
  standard: 'hcs-1',
  op: 'create',
  data: 'SGVsbG8gV29ybGQ=',
});

// ---- HCS-2: Topic Registry ----
// Synthetic — common registry operation
export const HCS2_REGISTER = b64({
  p: 'hcs-2',
  op: 'register',
  t_id: '0.0.8888888',
  m: 'Agent registry entry',
});

export const HCS2_UPDATE = b64({
  p: 'hcs-2',
  op: 'update',
  t_id: '0.0.8888888',
  uid: 'abc123',
});

export const HCS2_DELETE = b64({ p: 'hcs-2', op: 'delete', uid: 'abc123' });
export const HCS2_MIGRATE = b64({ p: 'hcs-2', op: 'migrate', t_id: '0.0.9999999' });

// ---- HCS-3: Recursive file loading ----
export const HCS3_FILE_REF = b64({
  p: 'hcs-3',
  refs: ['hcs://1/0.0.12345', 'hcs://1/0.0.12346'],
});

// ---- HCS-5: Hashinal Registry ----
export const HCS5_REGISTER = b64({
  p: 'hcs-5',
  op: 'register',
  t_id: '0.0.7777777',
  m: 'Hashinal NFT registry',
});

// ---- HCS-6: Dynamic Hashinal ----
export const HCS6_REGISTER = b64({
  p: 'hcs-6',
  op: 'register',
  t_id: '0.0.6666666',
});

// ---- HCS-7: Smart Hashinal ----
export const HCS7_SMART = b64({
  p: 'hcs-7',
  op: 'create',
  data: 'some-wasm-ref',
});

// ---- HCS-10: Agent Communication ----
export const HCS10_REGISTER = b64({
  p: 'hcs-10',
  op: 'register',
  operator_id: '0.0.555555@0.0.666666',
});

export const HCS10_MESSAGE = b64({
  p: 'hcs-10',
  op: 'message',
  connection_id: 'conn_abc123',
  m: 'Hello from agent',
});

// ---- HCS-11: Profile (all types) ----
// Type 0: Personal profile
export const HCS11_PERSONAL = b64({
  version: 2,
  type: 0,
  display_name: 'Alice',
  alias: 'alice_hcs',
  bio: 'Hedera developer',
});

// Type 1: AI Agent profile
export const HCS11_AI_AGENT = b64({
  version: 2,
  type: 1,
  display_name: 'MyAgent',
  alias: 'my-agent',
  capabilities: ['text-generation'],
});

// Type 2: MCP Server profile
export const HCS11_MCP_SERVER = b64({
  version: 1,
  type: 2,
  display_name: 'MyMCP',
  inboundTopicId: '0.0.111111',
  outboundTopicId: '0.0.222222',
});

// Type 3: Flora profile
export const HCS11_FLORA = b64({
  version: 1,
  type: 3,
  display_name: 'FloraBot',
});

// ---- HCS-20: Auditable Points ----
export const HCS20_DEPLOY = b64({
  p: 'hcs-20',
  op: 'deploy',
  tick: 'MYPTS',
  max: '1000000',
  lim: '1000',
  metadata: 'My Points Token',
});

export const HCS20_MINT = b64({
  p: 'hcs-20',
  op: 'mint',
  tick: 'MYPTS',
  amt: '100',
  to: '0.0.12345',
});

export const HCS20_TRANSFER = b64({
  p: 'hcs-20',
  op: 'transfer',
  tick: 'MYPTS',
  amt: '50',
  from: '0.0.12345',
  to: '0.0.67890',
});

// ---- HCS-27: Transparency Log ----
export const HCS27_REGISTER = b64({
  p: 'hcs-27',
  op: 'register',
  metadata: {
    root: 'abc123def456',
    count: 100,
    timestamp: '2026-03-30T00:00:00Z',
  },
});

// ---- Fallback cases ----

// Plain text (not JSON)
export const PLAIN_TEXT = b64Text('Hello, world! This is a plain text message.');

// Custom JSON (no standard)
export const CUSTOM_JSON_WITH_TYPE = b64({ type: 'attestation', subject: '0.0.99999', claim: 'verified' });
export const CUSTOM_JSON_PLAIN = b64({ foo: 'bar', count: 42 });

// Ambiguous JSON — has a p field but unknown value
export const UNKNOWN_P_FIELD = b64({ p: 'hcs-99', data: 'something' });

// Binary — raw bytes that aren't valid UTF-8
export const BINARY_PAYLOAD = Buffer.from([0xFF, 0xFE, 0x00, 0x01, 0xAB, 0xCD]).toString('base64');

// JSON with extra unknown fields (should not reject)
export const HCS10_WITH_EXTRA_FIELDS = b64({
  p: 'hcs-10',
  op: 'register',
  operator_id: '0.0.555555@0.0.666666',
  extra_field: 'should not cause rejection',
  nested: { also: 'fine' },
});

// HCS-11 with string type value (coercion test for heuristic)
export const HCS11_STRING_TYPE = b64({
  version: 1,
  type: '1',
  display_name: 'StringTypeAgent',
});
