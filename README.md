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
│ seq=1  2026-02-26 21:26:48 UTC  0.0.10301284
│ JSON (tweet_attestation)
├──────────────────────────────────────────────────────────────────────
│  type               tweet_attestation
│  tweetId            12075651133
│  authorId           61633009
│  username           PeteHegseth
│  postedAt           2010-04-13T00:42:54.000Z
│  contentHash        4bce182fef0019f68f2b7789aa45854dd41a497b...
│  topicId            0.0.10301350
│  submittedAt        2026-02-26T21:26:46.444Z
└──────────────────────────────────────────────────────────────────────
```

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

- **`query`** -- Browse topic messages with pagination, automatic decoding, and optional raw/JSON output
- **`tail`** -- Live-follow a topic with polling-based updates
- **`decode`** -- Deep-inspect messages with auto-detection of HCS-1, HCS-2, HCS-10, and HCS-11 standards
- **`export`** -- Bulk-export topic history to JSONL, JSON, or CSV for offline analysis
- **`stats`** -- Compute topic analytics: message count, rate, payload sizes, top senders, standards breakdown

All commands support mainnet, testnet, and previewnet via `--network`. Output is terminal-formatted by default, with JSON and raw modes for scripting.

## Quick Examples

```bash
# Browse the last 20 messages on a topic
hcs-trace query 0.0.10301350 --limit 20

# Live-follow a topic (polls every 3s by default)
hcs-trace tail 0.0.10301350

# Deep-decode with field-level detail
hcs-trace decode 0.0.10301350 --limit 5

# Export full topic history as JSONL
hcs-trace export 0.0.10301350 --format jsonl > topic.jsonl

# Export with decoded payloads included
hcs-trace export 0.0.10301350 --format json --decode --output topic.json

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
| `-a, --all` | Fetch all pages without prompting | -- |
| `--from <seqnum>` | Start from sequence number | -- |
| `--raw` | Show raw base64, skip decode | -- |
| `--json` | Output as JSON array | -- |
| `--network <net>` | mainnet, testnet, or previewnet | mainnet |

```
┌────────┬────────────────────────┬──────────────────┬─────────────────────────────────────────────┐
│ Seq    │ Timestamp (UTC)        │ Payer            │ Type / Summary                              │
├────────┼────────────────────────┼──────────────────┼─────────────────────────────────────────────┤
│ 1      │ 2026-02-26 21:26:48    │ 0.0.10301284     │ JSON (tweet_attestation)  username=PeteHeg… │
├────────┼────────────────────────┼──────────────────┼─────────────────────────────────────────────┤
│ 2      │ 2026-02-26 21:26:53    │ 0.0.10301284     │ JSON (tweet_attestation)  username=PeteHeg… │
└────────┴────────────────────────┴──────────────────┴─────────────────────────────────────────────┘
```

### tail

Live-follow a topic with polling-based updates.

```bash
hcs-trace tail <topicId> [options]
```

| Option | Description | Default |
|---|---|---|
| `--interval <ms>` | Polling interval in milliseconds | 3000 |
| `--since <seqnum>` | Start from sequence number | current tip |
| `--raw` | Show raw base64, skip decode | -- |
| `--network <net>` | mainnet, testnet, or previewnet | mainnet |

```
Tailing 0.0.10301350 (mainnet)  Press Ctrl+C to stop

01:09:07  seq=6490  0.0.10301284  JSON (tweet_attestation)  username=...
01:09:12  seq=6491  0.0.10301284  JSON (tweet_attestation)  username=...
```

### decode

Fetch and fully decode messages with auto-detection of HCS standards and custom payloads.

```bash
hcs-trace decode <topicId> [options]
```

| Option | Description | Default |
|---|---|---|
| `-l, --limit <n>` | Number of messages to decode | 10 |
| `--seq <n>` | Decode a specific sequence number | -- |
| `--from <seqnum>` | Start from sequence number | -- |
| `--format <fmt>` | table, json, or raw | table |
| `--network <net>` | mainnet, testnet, or previewnet | mainnet |

Auto-detected standards: **HCS-1** (inscriptions), **HCS-2** (topic registries), **HCS-10** (agent communication), **HCS-11** (user profiles). Non-standard JSON payloads are parsed and displayed with extracted fields. Binary payloads are identified and labeled.

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
| `--from <seqnum>` | Start from sequence number | -- |
| `--decode` | Include decoded payload in output | -- |
| `--delay <ms>` | Delay between page fetches | 50 |
| `--network <net>` | mainnet, testnet, or previewnet | mainnet |

```bash
# Stream to file
hcs-trace export 0.0.10301350 --format jsonl --output topic.jsonl

# Pipe to jq
hcs-trace export 0.0.10301350 --format jsonl | jq '.payer_account_id'

# CSV for spreadsheets
hcs-trace export 0.0.10301350 --format csv --output topic.csv
```

### stats

Compute analytics for a topic: message count, rate, payload sizes, sender breakdown, and standards distribution.

```bash
hcs-trace stats <topicId> [options]
```

| Option | Description | Default |
|---|---|---|
| `--sample <n>` | Limit messages scanned | all |
| `--delay <ms>` | Delay between page fetches | 50 |
| `--network <net>` | mainnet, testnet, or previewnet | mainnet |

```
Messages
┌────────────────┬─────────────────────────────────────┐
│ Total messages │ 6,490                               │
│ First message  │ 2026-02-26T21:26:48 UTC  (seq=1)    │
│ Latest message │ 2026-03-25T01:09:07 UTC  (seq=6490) │
│ Message rate   │ 248.1 msg/day  (26 days)            │
└────────────────┴─────────────────────────────────────┘

Unique Payers
┌──────────────┬───────┬────────┐
│ Account      │ Count │ %      │
├──────────────┼───────┼────────┤
│ 0.0.10301284 │ 6,490 │ 100.0% │
└──────────────┴───────┴────────┘

Message Types
┌──────────────────────────┬───────┬───────┐
│ Standard / Type          │ Count │ %     │
├──────────────────────────┼───────┼───────┤
│ JSON (tweet_attestation) │ 6,303 │ 97.1% │
│ JSON (deletion_detected) │ 187   │ 2.9%  │
└──────────────────────────┴───────┴───────┘
```

## Standards Decoding

hcs-trace auto-detects and labels messages that follow [Hashgraph Online](https://hashgraphonline.com) HCS standards:

| Standard | Description | Detected Fields |
|---|---|---|
| **HCS-1** | File inscriptions with chunking | operation, file reference, metadata |
| **HCS-2** | Topic registries | operation, memo |
| **HCS-10** | Agent-to-agent communication | operation, protocol fields |
| **HCS-11** | User/agent profiles | display name, profile metadata |

Messages that don't match a known standard are still decoded: valid JSON is parsed and key fields are extracted, plain text is displayed directly, and binary payloads are identified.

Standards detection is built-in, based on known message shapes from the [Hashgraph Online standards](https://github.com/hashgraph-online) specifications.

## Why This Exists

If you work with HCS topics, you've done the loop: hit the Mirror Node API, paginate through results, base64-decode payloads, eyeball JSON keys to guess the standard. It works, but it's slow and repetitive.

hcs-trace handles pagination, decoding, and standards detection in one step so you can focus on what the messages actually say. It's a debugging and inspection tool -- not a submission client, not an SDK replacement.

## How It Fits with Existing Tools

hcs-trace is a read-only inspection layer. It doesn't submit messages, manage keys, or replace any SDK.

- **Hedera SDKs** handle transaction submission and signing. hcs-trace reads what's already on the network.
- **Mirror Node REST API** is the data source. hcs-trace adds pagination, decoding, formatting, and export on top.
- **HCS standards** (HCS-1, HCS-2, HCS-10, HCS-11) are detected by built-in pattern matching against known message shapes.
- **HashScan / explorers** show transactions in a browser. hcs-trace brings that inspection into the terminal with scriptable output.

## Network Support

All commands default to mainnet. Use `--network` to switch:

```bash
hcs-trace query 0.0.12345 --network testnet
hcs-trace tail 0.0.12345 --network previewnet
```

## Limitations

- **Polling-based tail** -- `tail` polls the Mirror Node REST API at a configurable interval. It is not a WebSocket stream.
- **Read-only** -- hcs-trace does not submit messages or sign transactions.
- **Mirror Node dependent** -- availability and rate limits are determined by the Mirror Node API.
- **Standards coverage** -- auto-detection covers HCS-1, HCS-2, HCS-10, and HCS-11. Other standards are decoded as generic JSON or binary.

## Roadmap

Planned but not yet committed:

- WebSocket-based tail (real-time vs polling)
- HCS-3 and HCS-5 standards detection
- Topic memo and admin key metadata display
- `--filter` flag for type/payer filtering within `query` and `export`

## License

MIT
