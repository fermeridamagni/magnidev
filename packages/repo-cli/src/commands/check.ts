import { Command } from "commander";
import prompts from "@clack/prompts";
import colors from "picocolors";

import { intro } from "../assets/intro";

function checkCommand(program: Command): Command {
  return program
    .command("check")
    .description("Check the status of the repository")
    .action(async () => {
      prompts.updateSettings({
        aliases: {
          w: "up",
          s: "down",
          a: "left",
          d: "right",
          esc: "cancel",
        },
      });

      prompts.intro(colors.white(intro));

      prompts.note("here will be the data", "Details");
    });
}

export { checkCommand };
