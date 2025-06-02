#!/usr/bin/env node

import { Command } from "commander";
import dotenv from "dotenv";
import path from "node:path";

import { commitCommand } from "./commands/commit";
import { releaseCommand } from "./commands/release";
import { checkCommand } from "./commands/check";

const program = new Command();

dotenv.config({ path: path.join(process.cwd(), ".env.local") });

program
  .version("1.0.0")
  .name("Repo CLI")
  .description("CLI for Single or Monorepo projects");

// Register commands
commitCommand(program);
releaseCommand(program);
checkCommand(program);

program.parse(process.argv);
