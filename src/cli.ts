#!/usr/bin/env -S deno run --allow-read

import { Command } from "commander";
import { print, evalToNormalForm, evalToNormalFormWithState } from "./eval.ts";
import { parseTerm } from "./parser.ts";
import { inferType, printType } from "./typechecker.ts";
import type { PTerm, PType, Environnement } from "./types.ts";
import { resetRegionCounter } from "./pterm/mkref.ts";

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

// Parse a file with multiple statements
// Format:
// - Lines starting with -- are comments
// - Empty lines are ignored
// - "let x = expr ;;" defines a variable in the environment
// - "expr ;;" evaluates and prints the expression
function parseStatements(content: string): Array<{ type: "let"; name: string; value: PTerm } | { type: "expr"; value: PTerm }> {
  const statements: Array<{ type: "let"; name: string; value: PTerm } | { type: "expr"; value: PTerm }> = [];

  // Split by ;; to get statements
  const parts = content.split(";;");

  for (const part of parts) {
    // Remove comments (lines starting with --)
    const lines = part.split("\n").filter(line => !line.trim().startsWith("--"));
    const cleaned = lines.join("\n").trim();

    if (cleaned === "") continue;

    // Check if it's a let binding
    const letMatch = cleaned.match(/^let\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*([\s\S]+)$/);
    if (letMatch) {
      const [, name, valueStr] = letMatch;
      const value = parseTerm(valueStr.trim());
      if (value === null) {
        throw new Error(`Failed to parse: ${valueStr.trim()}`);
      }
      statements.push({ type: "let", name, value });
    } else {
      // It's an expression
      const value = parseTerm(cleaned);
      if (value === null) {
        throw new Error(`Failed to parse: ${cleaned}`);
      }
      statements.push({ type: "expr", value });
    }
  }

  return statements;
}

program
  .command("run")
  .description("Run a file with multiple statements")
  .argument("<file>", "File to run")
  .option("-s, --steps <number>", "Maximum evaluation steps per expression", "1000")
  .action(async (file: string, options: { steps: string }) => {
    const maxSteps = parseInt(options.steps, 10);

    try {
      const content = await Deno.readTextFile(file);
      const statements = parseStatements(content);

      // Reset region counter for fresh execution
      resetRegionCounter();

      // Runtime state (for regions)
      let state: Map<string, PTerm> = new Map();
      // Type environment
      const typeEnv: Environnement<PType> = new Map();

      for (const stmt of statements) {
        if (stmt.type === "let") {
          console.log(`let ${stmt.name} = ${print(stmt.value)}`);

          // Type check
          const typeResult = inferType(stmt.value, typeEnv);
          if (!typeResult.success) {
            console.error(`  Type error: ${typeResult.error}`);
            Deno.exit(1);
          }
          console.log(`  : ${printType(typeResult.type)}`);

          // Evaluate
          const evalResult = evalToNormalFormWithState(stmt.value, state, maxSteps);
          if (evalResult === null) {
            console.error(`  Evaluation error`);
            Deno.exit(1);
          }

          // Update state and add binding
          state = evalResult.state;
          state.set(stmt.name, evalResult.term);
          typeEnv.set(stmt.name, typeResult.type);
          console.log(`  = ${print(evalResult.term)}`);

        } else {
          console.log(`> ${print(stmt.value)}`);

          // Type check
          const typeResult = inferType(stmt.value, typeEnv);
          if (!typeResult.success) {
            console.error(`  Type error: ${typeResult.error}`);
            Deno.exit(1);
          }
          console.log(`  : ${printType(typeResult.type)}`);

          // Evaluate
          const evalResult = evalToNormalFormWithState(stmt.value, state, maxSteps);
          if (evalResult === null) {
            console.error(`  Evaluation error`);
            Deno.exit(1);
          }
          // Update state (for side effects)
          state = evalResult.state;
          console.log(`  = ${print(evalResult.term)}`);
        }
      }

    } catch (e) {
      console.error(`Error: ${e}`);
      Deno.exit(1);
    }
  });

program.parse();
