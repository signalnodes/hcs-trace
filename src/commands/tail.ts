import { Command } from "commander";
import chalk from "chalk";
import ora from "ora";
import { normalizeTopic } from "../utils/topic-id.js";
import { formatTimestamp } from "../utils/time.js";
import { fetchTopicInfo, fetchPage, fetchTip, sleep } from "../mirror/client.js";
import { detect } from "../decode/detector.js";

export function tailCommand(): Command {
  return new Command("tail")
    .description("Live-follow an HCS topic, printing new messages as they arrive")
    .argument("<topicId>", "HCS topic ID")
    .option("--interval <ms>", "polling interval in milliseconds", "3000")
    .option("--since <seqnum>", "start from sequence number (default: current tip)")
    .option("--raw", "show raw base64, skip decode")
    .option("--network <net>", "mainnet | testnet | previewnet", "mainnet")
    .action(async (topicIdArg: string, opts) => {
      const topicId = normalizeTopic(topicIdArg);
      const network: string = opts.network;
      const intervalMs = parseInt(opts.interval, 10);

      const spinner = ora(`Connecting to ${topicId}...`).start();

      try {
        await fetchTopicInfo(topicId, network);
      } catch (err) {
        spinner.fail(String(err));
        process.exit(1);
      }

      let cursor = opts.since ? parseInt(opts.since, 10) - 1 : await fetchTip(topicId, network);
      spinner.stop();

      console.log(chalk.bold(`\nTailing ${topicId}`) + chalk.dim(`  (${network}, polling every ${intervalMs}ms)`));
      console.log(chalk.dim(`Cursor: seq=${cursor}  (Ctrl+C to stop)\n`));

      let seen = 0;

      process.on("SIGINT", () => {
        console.log(chalk.dim(`\nStopped. ${seen} message${seen !== 1 ? "s" : ""} received this session.`));
        process.exit(0);
      });

      while (true) {
        const page = await fetchPage(topicId, network, {
          limit: 100,
          order: "asc",
          sequenceNumberGt: cursor,
        });

        for (const msg of page.messages) {
          cursor = msg.sequence_number;
          seen++;

          const ts = formatTimestamp(msg.consensus_timestamp).slice(0, 8); // HH:MM:SS
          const seq = chalk.dim(`seq=${msg.sequence_number}`);
          const payer = chalk.dim(msg.payer_account_id);

          if (opts.raw) {
            console.log(`[${ts}] ${seq}  ${payer}  ${chalk.dim(msg.message.slice(0, 48) + "…")}`);
          } else {
            const result = detect(msg.message);
            const label = colorLabel(result.label);
            const summary = chalk.dim(result.summary.slice(0, 48));
            console.log(`[${ts}] ${seq}  ${payer}  ${label}  ${summary}`);
          }
        }

        await sleep(intervalMs);
      }
    });
}

function colorLabel(label: string): string {
  if (label.includes("deletion") || label.includes("DELETION")) return chalk.red(label);
  if (label.includes("attestation") || label.includes("HCS-11")) return chalk.green(label);
  if (label.includes("HCS-10") || label.includes("HCS-2")) return chalk.cyan(label);
  return chalk.yellow(label);
}
