export type HcsStandard =
  | "HCS-1"
  | "HCS-2"
  | "HCS-10"
  | "HCS-11"
  | "CUSTOM_JSON"
  | "BINARY"
  | "UNKNOWN";

export interface DecodeResult {
  standard: HcsStandard;
  label: string;
  raw: string;          // original base64
  decoded: string;      // utf-8 string if decodable, else "(binary)"
  parsed: unknown;      // parsed JSON object if applicable
  summary: string;      // one-line human description
}

export function detect(base64: string): DecodeResult {
  let decoded: string;
  try {
    decoded = Buffer.from(base64, "base64").toString("utf-8");
  } catch {
    return {
      standard: "BINARY",
      label: "Binary",
      raw: base64,
      decoded: "(binary)",
      parsed: null,
      summary: "(binary payload)",
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(decoded);
  } catch {
    // Not JSON — could be plain text or binary-as-utf8
    return {
      standard: "UNKNOWN",
      label: "Plain text",
      raw: base64,
      decoded,
      parsed: null,
      summary: decoded.slice(0, 80),
    };
  }

  const obj = parsed as Record<string, unknown>;

  // HCS-1: inscription with file chunking
  if (obj.p === "hcs-1" || obj.standard === "hcs-1") {
    return { standard: "HCS-1", label: "HCS-1 Inscription", raw: base64, decoded, parsed, summary: summarize(obj, ["o", "f", "m"]) };
  }

  // HCS-2: topic registry
  if (obj.p === "hcs-2") {
    const op = String(obj.op ?? "");
    const memo = String(obj.m ?? obj.memo ?? "");
    return { standard: "HCS-2", label: "HCS-2 Registry", raw: base64, decoded, parsed, summary: `op=${op}${memo ? ` memo="${memo}"` : ""}` };
  }

  // HCS-10: agent communication
  if (obj.p === "hcs-10") {
    const op = String(obj.op ?? "");
    return { standard: "HCS-10", label: "HCS-10 Agent Comms", raw: base64, decoded, parsed, summary: `op=${op}` };
  }

  // HCS-11: profile
  if (obj.version && (obj.type === 1 || obj.type === "1") && obj.display_name) {
    const name = String(obj.display_name);
    return { standard: "HCS-11", label: "HCS-11 Profile", raw: base64, decoded, parsed, summary: `"${name}"` };
  }

  // Custom JSON — try to extract a type/p field for labeling
  const typeStr = String(obj.type ?? obj.p ?? "");
  return {
    standard: "CUSTOM_JSON",
    label: typeStr ? `JSON (${typeStr})` : "JSON",
    raw: base64,
    decoded,
    parsed,
    summary: typeStr ? summarize(obj, ["username", "tweetId", "account", "id"]) : decoded.slice(0, 80),
  };
}

function summarize(obj: Record<string, unknown>, fields: string[]): string {
  const parts: string[] = [];
  for (const f of fields) {
    if (obj[f] != null) parts.push(`${f}=${String(obj[f]).slice(0, 32)}`);
  }
  return parts.join("  ") || JSON.stringify(obj).slice(0, 80);
}
