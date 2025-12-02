#!/usr/bin/env -S deno run --allow-read

import { Command } from "commander";
import { print, evalToNormalForm } from "./eval.ts";
import { parseTerm } from "./parser.ts";
import { inferType, printType } from "./typechecker.ts";

const program = new Command();

program
  .name("lambda")
  .description("Lambda calculus term evaluator and type checker")
  .version("1.0.0");

program
  .command("eval")
  .description("Evaluate a lambda calculus term")
  .argument(
    "<term>",
    "Lambda term to evaluate (e.g., '(\\x.x) y' or '(λx.x) y')"
  )
  .option("-s, --steps <number>", "Maximum evaluation steps", "1000")
  .action((term: string, options: { steps: string }) => {
    const maxSteps = parseInt(options.steps, 10);

    const parsed = parseTerm(term);

    if (parsed === null) {
      console.error(`Error: Failed to parse term: ${term}`);
      Deno.exit(1);
    }

    console.log(`Input:  ${print(parsed)}`);

    const result = evalToNormalForm(parsed, new Map(), maxSteps);

    if (result === null) {
      console.error("Error: Evaluation failed");
      Deno.exit(1);
    }

    console.log(`Result: ${print(result)}`);
  });

program
  .command("type")
  .description("Type check a lambda calculus term")
  .argument("<term>", "Lambda term to type check (e.g., '\\x.x' or 'λx.x')")
  .action((term: string) => {
    const parsed = parseTerm(term);

    if (parsed === null) {
      console.error(`Error: Failed to parse term: ${term}`);
      Deno.exit(1);
    }

    console.log(`Term: ${print(parsed)}`);

    const result = inferType(parsed);

    if (result.success) {
      console.log(`Type: ${printType(result.type)}`);
    } else {
      console.log(`Not typable: ${result.error}`);
      Deno.exit(1);
    }
  });

program.parse();
