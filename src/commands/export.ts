import { Command } from "commander";
import * as fs from "node:fs";
import ora from "ora";
import { normalizeTopic } from "../utils/topic-id.js";
import { timestampToDate } from "../utils/time.js";
import { fetchTopicInfo, fetchPage, sleep } from "../mirror/client.js";
import { decode } from "../decode/pipeline.js";
import { parseFilterOptions, matchesFilters, hasFilters } from "../utils/filters.js";

const SCHEMA_VERSION = "0.2.0";

export function exportCommand(): Command {
  return new Command("export")
    .description("Export all messages from an HCS topic to JSONL, JSON, or CSV")
    .argument("<topicId>", "HCS topic ID")
    .option("--format <fmt>", "jsonl | json | csv", "jsonl")
    .option("--output <file>", "output file (default: stdout)")
    .option("--limit <n>", "max messages to export")
    .option("--from <seqnum>", "start from sequence number")
    .option("--decode", "include decoded payload in output")
    .option("--delay <ms>", "delay between page fetches (ms)", "50")
    .option("--filter-standard <std>", "filter by standard (e.g. HCS-10)")
    .option("--filter-payer <account>", "filter by payer account ID")
    .option("--filter-text <search>", "filter by substring in decoded content")
    .option("--filter-confidence <level>", "filter by confidence: high | medium | low")
    .option("--network <net>", "mainnet | testnet | previewnet", "mainnet")
    .action(async (topicIdArg: string, opts) => {
      const topicId = normalizeTopic(topicIdArg);
      const network: string = opts.network;
      const delayMs = parseInt(opts.delay, 10);
      const maxMessages = opts.limit ? parseInt(opts.limit, 10) : Infinity;
      const filters = parseFilterOptions(opts);
      const filtering = hasFilters(filters);

      // Filters require decoding — enable automatically
      const shouldDecode = opts.decode || filtering;

      const out = opts.output
        ? fs.createWriteStream(opts.output, { encoding: "utf8" })
        : process.stdout;

      const spinner = opts.output ? ora(`Exporting ${topicId}...`).start() : null;

      try {
        await fetchTopicInfo(topicId, network);
      } catch (err) {
        spinner?.fail(String(err));
        process.exit(1);
      }

      let cursor: string | null = null;
      let first = true;
      let total = 0;
      const allMessages: object[] = []; // for JSON array format only

      if (opts.format === "csv") {
        const baseCols = "sequence_number,consensus_timestamp,payer_account_id,chunk_number,chunk_total,message_raw";
        const decodeCols = shouldDecode ? ",standard,detected_by,confidence,summary" : "";
        out.write(baseCols + decodeCols + "\n");
      }

      while (total < maxMessages) {
        const batchLimit = Math.min(100, maxMessages - total);
        const page = await fetchPage(topicId, network, {
          limit: batchLimit,
          order: "asc",
          cursor: cursor ?? undefined,
          sequenceNumberGt: first && opts.from ? parseInt(opts.from, 10) - 1 : undefined,
        });
        first = false;

        for (const msg of page.messages) {
          if (total >= maxMessages) break;

          // Decode (always if filters active, else only if --decode)
          const decodeResult = shouldDecode ? decode(msg.message) : null;

          // Apply filters
          if (filtering && decodeResult) {
            if (!matchesFilters(decodeResult, msg.payer_account_id, filters)) continue;
          }

          total++;

          const base: Record<string, unknown> = {
            schema_version: SCHEMA_VERSION,
            sequence_number: msg.sequence_number,
            consensus_timestamp: timestampToDate(msg.consensus_timestamp).toISOString(),
            payer_account_id: msg.payer_account_id,
            chunk_number: msg.chunk_info.number,
            chunk_total: msg.chunk_info.total,
            message_raw: msg.message,
          };

          if (opts.decode && decodeResult) {
            base['decode'] = {
              standard: decodeResult.standard,
              label: decodeResult.label,
              detected_by: decodeResult.detectedBy,
              confidence: decodeResult.confidence,
              content_type: decodeResult.contentType,
              summary: decodeResult.summary,
              extracted_fields: decodeResult.extractedFields,
              warnings: decodeResult.warnings,
            };
          }

          if (opts.format === "csv") {
            const row: unknown[] = [
              base['sequence_number'],
              base['consensus_timestamp'],
              base['payer_account_id'],
              base['chunk_number'],
              base['chunk_total'],
              `"${msg.message}"`,
            ];
            if (shouldDecode && decodeResult) {
              row.push(
                decodeResult.standard,
                decodeResult.detectedBy,
                decodeResult.confidence,
                `"${decodeResult.summary.replace(/"/g, '""')}"`,
              );
            }
            out.write(row.join(",") + "\n");
          } else if (opts.format === "jsonl") {
            out.write(JSON.stringify(base) + "\n");
          } else {
            allMessages.push(base);
          }
        }

        if (spinner) spinner.text = `Exported ${total} messages...`;

        if (!page.nextCursor || page.messages.length === 0) break;
        cursor = page.nextCursor;
        if (delayMs > 0) await sleep(delayMs);
      }

      if (opts.format === "json") {
        out.write(JSON.stringify(allMessages, null, 2) + "\n");
      }

      spinner?.succeed(`Exported ${total} messages${opts.output ? ` to ${opts.output}` : ""}`);
    });
}
