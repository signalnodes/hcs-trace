# hcs-trace

> Query, decode, and inspect HCS topic streams from the terminal.

[![npm version](https://img.shields.io/npm/v/hcs-trace.svg)](https://www.npmjs.com/package/hcs-trace)
[![node](https://img.shields.io/node/v/hcs-trace)](https://www.npmjs.com/package/hcs-trace)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

```bash
npx hcs-trace decode 0.0.10301350 --limit 3
```

```
Topic: 0.0.10301350  (mainnet)

┌──────────────────────────────────────────────────────────────────────
│ seq=42  2026-03-15 12:34:56 UTC  0.0.10301284
│ HCS-10 Agent Comms  validated · high
├──────────────────────────────────────────────────────────────────────
│  p                  hcs-10
│  op                 register
│  operator_id        0.0.555555@0.0.666666
└──────────────────────────────────────────────────────────────────────
```

Every decoded message now shows **what standard it is**, **how we know** (`validated`, `heuristic`, or `fallback`), and **how confident** the detection is (`high`, `medium`, or `low`).

## Install

```bash
npm install -g hcs-trace
```

Or run directly with `npx`:

```bash
npx hcs-trace <command> [options]
```

Requires Node.js >= 20.

## What It Does

- **`query`** — Browse topic messages with pagination, automatic decoding, filter support, and optional raw/JSON output
- **`tail`** — Live-follow a topic with polling-based updates and provenance markers
- **`decode`** — Deep-inspect messages with provenance/confidence display and optional `--explain` mode
- **`export`** — Bulk-export topic history to JSONL, JSON, or CSV with filter support and versioned schema
- **`stats`** — Compute topic analytics: message count, rate, payload sizes, top senders, standards breakdown, detection source distribution
- **`topic`** — Inspect topic-level metadata (memo, keys, auto-renew, timestamps)

All commands support mainnet, testnet, and previewnet via `--network`.

## Quick Examples

```bash
# Browse the last 20 messages on a topic
hcs-trace query 0.0.10301350 --limit 20

# Filter by standard
hcs-trace query 0.0.10301350 --filter-standard HCS-10

# Filter by payer
hcs-trace query 0.0.10301350 --filter-payer 0.0.12345

# Live-follow a topic (polls every 3s by default)
hcs-trace tail 0.0.10301350

# Deep-decode with field-level detail and provenance
hcs-trace decode 0.0.10301350 --limit 5

# Decode with classification explanation
hcs-trace decode 0.0.10301350 --explain

# Inspect topic metadata
hcs-trace topic 0.0.10301350

# Export full topic history as JSONL with decoded payloads
hcs-trace export 0.0.10301350 --format jsonl --decode > topic.jsonl

# Export only high-confidence HCS-10 messages
hcs-trace export 0.0.10301350 --decode --filter-standard HCS-10 --filter-confidence high

# Topic analytics (sample first 500 messages)
hcs-trace stats 0.0.10301350 --sample 500
```

## Commands

### query

Fetch and display messages from an HCS topic with pagination.

```bash
hcs-trace query <topicId> [options]
```

| Option | Description | Default |
|---|---|---|
| `-l, --limit <n>` | Messages per page | 25 |
| `-a, --all` | Fetch all pages without prompting | — |
| `--from <seqnum>` | Start from sequence number | — |
| `--raw` | Show raw base64, skip decode | — |
| `--json` | Output as JSON array | — |
| `--filter-standard <std>` | Filter by standard, e.g. `HCS-10` | — |
| `--filter-payer <account>` | Filter by payer account ID | — |
| `--filter-text <search>` | Filter by substring in decoded content | — |
| `--filter-confidence <level>` | Filter by confidence: high, medium, low | — |
| `--network <net>` | mainnet, testnet, or previewnet | mainnet |

The table adds a dim provenance marker (`·v` = validated, `·h` = heuristic, `·f` = fallback) to each type label.

### tail

Live-follow a topic with polling-based updates.

```bash
hcs-trace tail <topicId> [options]
```

| Option | Description | Default |
|---|---|---|
| `--interval <ms>` | Polling interval in milliseconds | 3000 |
| `--since <seqnum>` | Start from sequence number | current tip |
| `--raw` | Show raw base64, skip decode | — |
| `--network <net>` | mainnet, testnet, or previewnet | mainnet |

Each line includes a dim `[v]`/`[h]`/`[f]` marker indicating detection source.

### decode

Fetch and fully decode messages with auto-detection of HCS standards.

```bash
hcs-trace decode <topicId> [options]
```

| Option | Description | Default |
|---|---|---|
| `-l, --limit <n>` | Number of messages to decode | 10 |
| `--seq <n>` | Decode a specific sequence number | — |
| `--from <seqnum>` | Start from sequence number | — |
| `--format <fmt>` | table, json, or raw | table |
| `--explain` | Show why each message was classified as it was | — |
| `--network <net>` | mainnet, testnet, or previewnet | mainnet |

With `--explain`:

```
│ HCS-10 Agent Comms  validated · high
│ ℹ  Validated: parsed successfully against HCS-10 Zod schema
```

JSON format includes `detected_by`, `confidence`, `content_type`, `extracted_fields`, and `warnings`.

### topic

Inspect topic-level metadata from the mirror node.

```bash
hcs-trace topic <topicId> [options]
```

| Option | Description | Default |
|---|---|---|
| `--network <net>` | mainnet, testnet, or previewnet | mainnet |

Displays: topic ID, network, memo, admin key, submit key, auto-renew account and period, created timestamp, and active/deleted status.

### export

Bulk-export topic messages to JSONL, JSON, or CSV.

```bash
hcs-trace export <topicId> [options]
```

| Option | Description | Default |
|---|---|---|
| `--format <fmt>` | jsonl, json, or csv | jsonl |
| `--output <file>` | Output file (omit for stdout) | stdout |
| `--limit <n>` | Max messages to export | all |
| `--from <seqnum>` | Start from sequence number | — |
| `--decode` | Include decoded payload in output | — |
| `--delay <ms>` | Delay between page fetches | 50 |
| `--filter-standard <std>` | Filter by standard | — |
| `--filter-payer <account>` | Filter by payer account ID | — |
| `--filter-text <search>` | Filter by substring in decoded content | — |
| `--filter-confidence <level>` | Filter by confidence: high, medium, low | — |
| `--network <net>` | mainnet, testnet, or previewnet | mainnet |

**Note (breaking change from v0.1):** When `--decode` is used, the JSON/JSONL export shape has changed. Decoded fields are now nested under a `decode` key. All exports include a `schema_version` field.

Example `--decode` record (JSONL/JSON):

```json
{
  "schema_version": "0.2.0",
  "sequence_number": 42,
  "consensus_timestamp": "2026-03-15T12:34:56.000Z",
  "payer_account_id": "0.0.12345",
  "chunk_number": 1,
  "chunk_total": 1,
  "message_raw": "eyJ...",
  "decode": {
    "standard": "HCS-10",
    "label": "HCS-10 Agent Comms",
    "detected_by": "validated",
    "confidence": "high",
    "content_type": "json",
    "summary": "op=register",
    "extracted_fields": { "op": "register" },
    "warnings": []
  }
}
```

CSV with `--decode` adds flat columns: `standard`, `detected_by`, `confidence`, `summary`.

### stats

Compute analytics for a topic.

```bash
hcs-trace stats <topicId> [options]
```

| Option | Description | Default |
|---|---|---|
| `--sample <n>` | Limit messages scanned | all |
| `--delay <ms>` | Delay between page fetches | 50 |
| `--network <net>` | mainnet, testnet, or previewnet | mainnet |

Includes: message count/rate, payload sizes, unique payers, standards distribution, **detection source distribution** (new), **confidence distribution** (new), and chunk breakdown.

## Standards Detection

hcs-trace detects and labels messages from the [Hashgraph Online](https://hashgraphonline.com) HCS standards.

Every detection result includes three pieces of provenance:

| Field | Values | Meaning |
|---|---|---|
| `detectedBy` | `validated` | Passed a structural Zod schema — high certainty |
| | `heuristic` | Matched field patterns (e.g. `p` field) — good certainty |
| | `fallback` | Generic classification — low certainty |
| `confidence` | `high` | Strong structural match, validated parse |
| | `medium` | Likely match, field-pattern based |
| | `low` | Generic fallback — treat with caution |

### Supported Standards

| Standard | Description | Detection |
|---|---|---|
| **HCS-1** | File inscriptions with chunking | `p=hcs-1` or `standard=hcs-1` |
| **HCS-2** | Topic registries | `p=hcs-2` + `op` field |
| **HCS-3** | Recursive file loading | `p=hcs-3` |
| **HCS-5** | Hashinal NFT registry | `p=hcs-5` + `op` field |
| **HCS-6** | Dynamic Hashinals | `p=hcs-6` |
| **HCS-7** | Smart Hashinals | `p=hcs-7` |
| **HCS-10** | Agent-to-agent communication | `p=hcs-10` + `op` field |
| **HCS-11** | Profiles (personal, AI agent, MCP server, flora) | `version` + `type` (0–3) + `display_name` |
| **HCS-20** | Auditable points | `p=hcs-20` + `op` + `tick` |
| **HCS-27** | Transparency logs | `p=hcs-27` + `op=register` |

Messages that don't match any standard are still decoded: valid JSON is parsed and key fields are extracted (`CUSTOM_JSON`, confidence `low`), plain text is displayed directly (`UNKNOWN`, confidence `low`), and binary payloads are identified (`BINARY`, confidence `low`).

## Why This Exists

If you work with HCS topics, you've done the loop: hit the Mirror Node API, paginate through results, base64-decode payloads, eyeball JSON keys to guess the standard. It works, but it's slow and repetitive.

hcs-trace handles pagination, decoding, and standards detection in one step so you can focus on what the messages actually say. It tells you **what a message is, how it knows, and how confident it is**.

It's a debugging and inspection tool — not a submission client, not an SDK replacement.

## How It Fits with Existing Tools

- **Hedera SDKs** handle transaction submission and signing. hcs-trace reads what's already on the network.
- **Mirror Node REST API** is the data source. hcs-trace adds pagination, decoding, formatting, and export on top.
- **HashScan / explorers** show transactions in a browser. hcs-trace brings that inspection into the terminal with scriptable output.

## Network Support

All commands default to mainnet. Use `--network` to switch:

```bash
hcs-trace query 0.0.12345 --network testnet
hcs-trace tail 0.0.12345 --network previewnet
```

## Limitations

- **Polling-based tail** — `tail` polls the Mirror Node REST API. It is not a WebSocket stream.
- **Read-only** — hcs-trace does not submit messages or sign transactions.
- **Mirror Node dependent** — availability and rate limits are determined by the Mirror Node API.
- **Client-side filtering** — `--filter-*` options fetch pages and filter locally, not server-side.

## Breaking Changes in v0.2

- **`export --decode` output shape changed**: decoded fields are now nested under a `decode` key instead of flat `standard`/`decoded` fields. All exports include `schema_version: "0.2.0"`.
- If you parse `--decode` export output, update your consumers to read from `decode.standard`, `decode.detected_by`, etc.

## Roadmap

- v0.3: rate limiting / retry logic, timestamp range filters (`--since` / `--until`), WebSocket-based tail
- v0.3: sample topics and golden test corpus from live mainnet data
- v0.3: selected new standards as they mature

## License

MIT
