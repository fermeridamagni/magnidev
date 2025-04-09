#!/usr/bin/env node

import { Command } from "commander";
import * as path from "node:path";

import { commitCommand } from "./commands/commit";
import { releaseCommand } from "./commands/release";

const program = new Command();

program
  .version("1.0.0")
  .name("Repo CLI")
  .description("CLI for Single or Monorepo projects");

// Register commands
commitCommand(program);
releaseCommand(program);

program.parse(process.argv);
