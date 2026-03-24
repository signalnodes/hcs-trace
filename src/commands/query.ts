import { Command } from "commander";
import chalk from "chalk";
import Table from "cli-table3";
import ora from "ora";
import { normalizeTopic } from "../utils/topic-id.js";
import { formatTimestamp } from "../utils/time.js";
import { fetchTopicInfo, fetchPage } from "../mirror/client.js";
import { detect } from "../decode/detector.js";
import type { MirrorMessage } from "../mirror/types.js";

export function queryCommand(): Command {
  return new Command("query")
    .description("Fetch and display messages from an HCS topic")
    .argument("<topicId>", "HCS topic ID (e.g. 0.0.10301350)")
    .option("-l, --limit <n>", "messages per page", "25")
    .option("-a, --all", "fetch all pages without prompting")
    .option("--from <seqnum>", "start from sequence number")
    .option("--raw", "show raw base64, skip decode")
    .option("--json", "output raw JSON")
    .option("--network <net>", "mainnet | testnet | previewnet", "mainnet")
    .action(async (topicIdArg: string, opts) => {
      const topicId = normalizeTopic(topicIdArg);
      const network: string = opts.network;
      const limit = parseInt(opts.limit, 10);

      const spinner = ora(`Fetching topic ${topicId}...`).start();

      let info;
      try {
        info = await fetchTopicInfo(topicId, network);
        spinner.stop();
      } catch (err) {
        spinner.fail(String(err));
        process.exit(1);
      }

      if (opts.json) {
        // JSON mode — just dump everything
        const all: MirrorMessage[] = [];
        let cursor: string | null = null;
        let first = true;
        while (true) {
          const page = await fetchPage(topicId, network, {
            limit,
            order: "asc",
            cursor: cursor ?? undefined,
            sequenceNumberGt: first && opts.from ? parseInt(opts.from, 10) - 1 : undefined,
          });
          first = false;
          all.push(...page.messages);
          if (!page.nextCursor || page.messages.length === 0 || !opts.all) break;
          cursor = page.nextCursor;
        }
        console.log(JSON.stringify(all, null, 2));
        return;
      }

      // Header
      console.log();
      console.log(chalk.bold(`Topic: ${topicId}`) + chalk.dim(`  (${network})`));
      if (info.memo) console.log(chalk.dim(`Memo:  ${info.memo}`));
      console.log();

      let cursor: string | null = null;
      let first = true;
      let totalShown = 0;

      while (true) {
        const page = await fetchPage(topicId, network, {
          limit,
          order: "asc",
          cursor: cursor ?? undefined,
          sequenceNumberGt: first && opts.from ? parseInt(opts.from, 10) - 1 : undefined,
        });
        first = false;

        if (page.messages.length === 0) {
          console.log(chalk.dim("  No messages found."));
          break;
        }

        renderTable(page.messages, opts.raw);
        totalShown += page.messages.length;

        if (!page.nextCursor || page.messages.length < limit) break;
        cursor = page.nextCursor;

        if (!opts.all) {
          const shouldContinue = await promptContinue(totalShown);
          if (!shouldContinue) break;
        }
      }

      console.log(chalk.dim(`\n${totalShown} message${totalShown !== 1 ? "s" : ""} shown`));
    });
}

function renderTable(messages: MirrorMessage[], raw: boolean): void {
  const table = new Table({
    head: ["Seq", "Timestamp (UTC)", "Payer", "Type / Summary"],
    style: { head: ["cyan"] },
    colWidths: [8, 24, 18, 45],
  });

  for (const msg of messages) {
    const ts = formatTimestamp(msg.consensus_timestamp);
    const payer = msg.payer_account_id;

    if (raw) {
      table.push([msg.sequence_number, ts, payer, chalk.dim(msg.message.slice(0, 40) + "…")]);
    } else {
      const result = detect(msg.message);
      const typeLabel = chalk.cyan(result.label);
      const summary = chalk.dim(result.summary.slice(0, 42));
      table.push([msg.sequence_number, ts, payer, `${typeLabel}  ${summary}`]);
    }
  }

  console.log(table.toString());
}

async function promptContinue(shown: number): Promise<boolean> {
  process.stdout.write(chalk.dim(`\n[${shown} shown] Press Enter for next page, q to quit: `));
  return new Promise((resolve) => {
    if (process.stdin.isTTY && typeof process.stdin.setRawMode === "function") {
      process.stdin.setRawMode(true);
      process.stdin.resume();
      process.stdin.setEncoding("utf8");
      process.stdin.once("data", (key: string) => {
        process.stdin.setRawMode(false);
        process.stdin.pause();
        process.stdout.write("\n");
        resolve(key !== "q" && key !== "Q");
      });
    } else {
      // Non-TTY fallback (piped input etc.) — just continue
      process.stdout.write("\n");
      resolve(true);
    }
  });
}
