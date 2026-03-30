import { Command } from "commander";
import { queryCommand } from "./commands/query.js";
import { tailCommand } from "./commands/tail.js";
import { decodeCommand } from "./commands/decode.js";
import { exportCommand } from "./commands/export.js";
import { statsCommand } from "./commands/stats.js";
import { topicCommand } from "./commands/topic.js";

const program = new Command();

program
  .name("hcs-trace")
  .description(
    "Terminal-first HCS topic inspector with standards-aware decoding.\n" +
    "Inspect HCS topics like a developer, not an archaeologist."
  )
  .version("0.2.0");

program.addCommand(queryCommand());
program.addCommand(tailCommand());
program.addCommand(decodeCommand());
program.addCommand(exportCommand());
program.addCommand(statsCommand());
program.addCommand(topicCommand());

program.parse();
