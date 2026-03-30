import { Command } from "commander";
import chalk from "chalk";
import Table from "cli-table3";
import ora from "ora";
import { normalizeTopic } from "../utils/topic-id.js";
import { timestampToDate } from "../utils/time.js";
import { fetchTopicInfo } from "../mirror/client.js";

export function topicCommand(): Command {
  return new Command("topic")
    .description("Inspect topic-level metadata from the mirror node")
    .argument("<topicId>", "HCS topic ID (e.g. 0.0.10301350)")
    .option("--network <net>", "mainnet | testnet | previewnet", "mainnet")
    .action(async (topicIdArg: string, opts) => {
      const topicId = normalizeTopic(topicIdArg);
      const network: string = opts.network;

      const spinner = ora(`Fetching topic ${topicId}...`).start();

      let info;
      try {
        info = await fetchTopicInfo(topicId, network);
        spinner.stop();
      } catch (err) {
        spinner.fail(String(err));
        process.exit(1);
      }

      console.log();
      console.log(chalk.bold(`Topic: ${topicId}`) + chalk.dim(`  (${network})`));
      console.log();

      const table = new Table({ style: { head: ["cyan"] } });

      table.push(["Topic ID", info.topic_id]);
      table.push(["Network", network]);
      table.push(["Memo", info.memo || chalk.dim("(none)")]);

      // Admin key
      if (info.admin_key) {
        const keySnippet = info.admin_key.key.slice(0, 16) + "…";
        table.push(["Admin key", `${info.admin_key._type}  ${keySnippet}`]);
      } else {
        table.push(["Admin key", chalk.dim("none")]);
      }

      // Submit key
      if (info.submit_key) {
        const keySnippet = info.submit_key.key.slice(0, 16) + "…";
        table.push(["Submit key", `${info.submit_key._type}  ${keySnippet}`]);
      } else {
        table.push(["Submit key", chalk.dim("none")]);
      }

      // Auto-renew
      if (info.auto_renew_account) {
        table.push(["Auto-renew account", info.auto_renew_account]);
      }
      if (info.auto_renew_period) {
        const days = Math.round(info.auto_renew_period / 86400);
        table.push(["Auto-renew period", `${info.auto_renew_period}s  (${days} days)`]);
      }

      // Timestamps
      if (info.created_timestamp) {
        const created = timestampToDate(info.created_timestamp);
        table.push(["Created", created.toISOString().replace("T", " ").slice(0, 19) + " UTC"]);
      }

      // Lifetime
      const isActive = !info.timestamp?.to;
      table.push(["Status", isActive ? chalk.green("active") : chalk.red("deleted/expired")]);

      if (info.deleted) {
        table.push(["Deleted", chalk.red("yes")]);
      }

      console.log(table.toString());
      console.log();
    });
}
