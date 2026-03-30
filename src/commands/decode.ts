import { Command } from "commander";
import chalk from "chalk";
import ora from "ora";
import { normalizeTopic } from "../utils/topic-id.js";
import { formatTimestamp } from "../utils/time.js";
import { fetchTopicInfo, fetchPage } from "../mirror/client.js";
import { decode } from "../decode/pipeline.js";

const SOURCE_LABEL: Record<string, string> = {
  validated: 'validated',
  heuristic: 'heuristic',
  fallback: 'fallback',
};

const CONFIDENCE_COLOR: Record<string, (s: string) => string> = {
  high: chalk.green,
  medium: chalk.yellow,
  low: chalk.dim,
};

export function decodeCommand(): Command {
  return new Command("decode")
    .description("Fetch and fully decode HCS messages, auto-detecting standards")
    .argument("<topicId>", "HCS topic ID")
    .option("-l, --limit <n>", "number of messages to decode", "10")
    .option("--seq <n>", "decode a specific sequence number")
    .option("--from <seqnum>", "start from sequence number")
    .option("--format <fmt>", "table | json | raw", "table")
    .option("--explain", "show why each message was classified as it was")
    .option("--network <net>", "mainnet | testnet | previewnet", "mainnet")
    .action(async (topicIdArg: string, opts) => {
      const topicId = normalizeTopic(topicIdArg);
      const network: string = opts.network;
      const limit = parseInt(opts.limit, 10);

      const spinner = ora(`Fetching ${topicId}...`).start();

      let info;
      try {
        info = await fetchTopicInfo(topicId, network);
      } catch (err) {
        spinner.fail(String(err));
        process.exit(1);
      }

      const page = await fetchPage(topicId, network, {
        limit,
        order: "asc",
        sequenceNumberGt: opts.seq
          ? parseInt(opts.seq, 10) - 1
          : opts.from
          ? parseInt(opts.from, 10) - 1
          : undefined,
      });

      const messages = opts.seq
        ? page.messages.filter((m) => m.sequence_number === parseInt(opts.seq, 10))
        : page.messages;

      spinner.stop();

      if (messages.length === 0) {
        console.log(chalk.yellow("No messages found."));
        return;
      }

      if (opts.format === "json") {
        const results = messages.map((msg) => {
          const result = decode(msg.message);
          return {
            sequence_number: msg.sequence_number,
            consensus_timestamp: msg.consensus_timestamp,
            payer_account_id: msg.payer_account_id,
            standard: result.standard,
            label: result.label,
            content_type: result.contentType,
            detected_by: result.detectedBy,
            confidence: result.confidence,
            summary: result.summary,
            extracted_fields: result.extractedFields,
            warnings: result.warnings,
            raw: result.raw,
            decoded: result.decoded,
            parsed: result.parsed,
          };
        });
        console.log(JSON.stringify(results, null, 2));
        return;
      }

      console.log();
      console.log(chalk.bold(`Topic: ${topicId}`) + chalk.dim(`  (${network})`));
      if (info.memo) console.log(chalk.dim(`Memo:  ${info.memo}`));
      console.log();

      for (const msg of messages) {
        const result = decode(msg.message);
        const ts = formatTimestamp(msg.consensus_timestamp);

        if (opts.format === "raw") {
          console.log(result.decoded);
          continue;
        }

        // Table format
        const headerLine =
          chalk.bold(`seq=${msg.sequence_number}`) +
          chalk.dim(`  ${ts}  ${msg.payer_account_id}`);

        const colorConf = CONFIDENCE_COLOR[result.confidence] ?? chalk.dim;
        const provenanceLine =
          chalk.cyan(result.label) +
          chalk.dim(`  ${SOURCE_LABEL[result.detectedBy]} · `) +
          colorConf(result.confidence);

        console.log("┌" + "─".repeat(70));
        console.log("│ " + headerLine);
        console.log("│ " + provenanceLine);

        if (opts.explain) {
          const explanation = getExplanation(result.detectedBy, result.standard);
          console.log("│ " + chalk.dim(`ℹ  ${explanation}`));
        }

        if (result.warnings.length > 0) {
          for (const w of result.warnings) {
            console.log("│ " + chalk.yellow(`⚠  ${w}`));
          }
        }

        console.log("├" + "─".repeat(70));

        if (result.parsed && typeof result.parsed === "object") {
          const obj = result.parsed as Record<string, unknown>;
          for (const [k, v] of Object.entries(obj)) {
            const val = typeof v === "string" ? v : JSON.stringify(v);
            const truncated = val.length > 60 ? val.slice(0, 57) + "…" : val;
            console.log(`│  ${chalk.dim(k.padEnd(18))} ${truncated}`);
          }
        } else {
          console.log(`│  ${result.decoded.slice(0, 200)}`);
        }

        console.log("└" + "─".repeat(70));
        console.log();
      }
    });
}

function getExplanation(detectedBy: string, standard: string): string {
  switch (detectedBy) {
    case 'validated':
      return `Validated: parsed successfully against ${standard} Zod schema`;
    case 'heuristic':
      return `Heuristic: matched field pattern for ${standard}`;
    case 'fallback':
      return standard === 'BINARY'
        ? 'Fallback: payload is not valid UTF-8 text'
        : standard === 'UNKNOWN'
        ? 'Fallback: plain text, no JSON detected'
        : 'Fallback: valid JSON but no standard pattern matched';
    default:
      return `Detected by ${detectedBy}`;
  }
}
