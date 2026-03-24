import { Command } from "commander";
import chalk from "chalk";
import Table from "cli-table3";
import ora from "ora";
import { normalizeTopic } from "../utils/topic-id.js";
import { timestampToDate } from "../utils/time.js";
import { fetchTopicInfo, fetchAllMessages } from "../mirror/client.js";
import { detect } from "../decode/detector.js";

export function statsCommand(): Command {
  return new Command("stats")
    .description("Compute statistics for an HCS topic (message count, rates, size, senders)")
    .argument("<topicId>", "HCS topic ID")
    .option("--sample <n>", "limit messages scanned (default: all)")
    .option("--delay <ms>", "delay between page fetches", "50")
    .option("--network <net>", "mainnet | testnet | previewnet", "mainnet")
    .action(async (topicIdArg: string, opts) => {
      const topicId = normalizeTopic(topicIdArg);
      const network: string = opts.network;
      const delayMs = parseInt(opts.delay, 10);
      const sample = opts.sample ? parseInt(opts.sample, 10) : undefined;

      const spinner = ora(`Fetching messages for ${topicId}...`).start();

      let info;
      try {
        info = await fetchTopicInfo(topicId, network);
      } catch (err) {
        spinner.fail(String(err));
        process.exit(1);
      }

      let messages;
      try {
        messages = await fetchAllMessages(topicId, network, {
          limit: sample ?? 100,
          delayMs,
        });
        if (sample && messages.length >= sample) {
          spinner.warn(`Sampled ${sample} messages (topic may have more)`);
        } else {
          spinner.succeed(`Loaded ${messages.length} messages`);
        }
      } catch (err) {
        spinner.fail(String(err));
        process.exit(1);
      }

      if (messages.length === 0) {
        console.log(chalk.yellow("No messages found."));
        return;
      }

      // Compute stats
      const first = messages[0]!;
      const last = messages[messages.length - 1]!;
      const firstDate = timestampToDate(first.consensus_timestamp);
      const lastDate = timestampToDate(last.consensus_timestamp);
      const spanDays = Math.max(1, (lastDate.getTime() - firstDate.getTime()) / 86400000);
      const rate = (messages.length / spanDays).toFixed(1);

      // Payload sizes (decoded bytes)
      const sizes = messages.map((m) => Buffer.from(m.message, "base64").length);
      sizes.sort((a, b) => a - b);
      const minSize = sizes[0]!;
      const maxSize = sizes[sizes.length - 1]!;
      const medianSize = sizes[Math.floor(sizes.length / 2)]!;
      const p95Size = sizes[Math.floor(sizes.length * 0.95)]!;

      // Unique payers
      const payerCounts = new Map<string, number>();
      for (const m of messages) {
        payerCounts.set(m.payer_account_id, (payerCounts.get(m.payer_account_id) ?? 0) + 1);
      }
      const sortedPayers = [...payerCounts.entries()].sort((a, b) => b[1] - a[1]);

      // Standard distribution
      const standardCounts = new Map<string, number>();
      for (const m of messages) {
        const result = detect(m.message);
        standardCounts.set(result.label, (standardCounts.get(result.label) ?? 0) + 1);
      }
      const sortedStandards = [...standardCounts.entries()].sort((a, b) => b[1] - a[1]);

      // Chunk stats
      const multiChunk = messages.filter((m) => m.chunk_info.total > 1).length;

      // Output
      console.log();
      console.log(chalk.bold(`Topic: ${topicId}`) + chalk.dim(`  (${network})`));
      if (info.memo) console.log(chalk.dim(`Memo:  ${info.memo}`));
      console.log();

      const msgTable = new Table({ style: { head: ["cyan"] } });
      msgTable.push(
        ["Total messages", messages.length.toLocaleString()],
        ["First message", `${firstDate.toISOString().slice(0, 19)} UTC  (seq=${first.sequence_number})`],
        ["Latest message", `${lastDate.toISOString().slice(0, 19)} UTC  (seq=${last.sequence_number})`],
        ["Message rate", `${rate} msg/day  (${spanDays.toFixed(0)} days)`],
      );
      console.log(chalk.bold("Messages"));
      console.log(msgTable.toString());

      const sizeTable = new Table({ style: { head: ["cyan"] } });
      sizeTable.push(
        ["Min", `${minSize} B`],
        ["Max", `${maxSize} B`],
        ["Median", `${medianSize} B`],
        ["p95", `${p95Size} B`],
      );
      console.log(chalk.bold("Payload Size (decoded bytes)"));
      console.log(sizeTable.toString());

      const payerTable = new Table({ head: ["Account", "Count", "%"], style: { head: ["cyan"] } });
      for (const [payer, count] of sortedPayers.slice(0, 10)) {
        payerTable.push([payer, count.toLocaleString(), `${((count / messages.length) * 100).toFixed(1)}%`]);
      }
      console.log(chalk.bold("Unique Payers"));
      console.log(payerTable.toString());

      const stdTable = new Table({ head: ["Standard / Type", "Count", "%"], style: { head: ["cyan"] } });
      for (const [label, count] of sortedStandards) {
        stdTable.push([label, count.toLocaleString(), `${((count / messages.length) * 100).toFixed(1)}%`]);
      }
      console.log(chalk.bold("Message Types"));
      console.log(stdTable.toString());

      const chunkTable = new Table({ style: { head: ["cyan"] } });
      chunkTable.push(
        ["Single-chunk", `${(messages.length - multiChunk).toLocaleString()}  (${(((messages.length - multiChunk) / messages.length) * 100).toFixed(1)}%)`],
        ["Multi-chunk", `${multiChunk.toLocaleString()}  (${((multiChunk / messages.length) * 100).toFixed(1)}%)`],
      );
      console.log(chalk.bold("Chunks"));
      console.log(chunkTable.toString());
    });
}
