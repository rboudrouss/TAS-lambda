import type { evalContext } from "./types.ts";
import { getImpl, type PTerm } from "./pterm/index.ts";

let varCounter = 0;

export function freshVarGen(): string {
  return `_v${varCounter++}`;
}

export function resetVarCounter(): void {
  varCounter = 0;
}

// Alpha conversion
export function alphaConvert(
  t: PTerm,
  renaming: Map<string, string> = new Map()
): PTerm {
  const impl = getImpl(t);
  return impl.alphaConversion(alphaConvert, renaming, freshVarGen, t);
}

// Check if term needs alpha conversion
export function needsConversion(t: PTerm): boolean {
  const impl = getImpl(t);
  const need = impl.needConversion;
  if (typeof need === "boolean") return need;
  return need(t, needsConversion);
}

// Substitution
export function substitute(t: PTerm, v: string, t0: PTerm): PTerm {
  const impl = getImpl(t);
  return impl.substitution(substitute, v, t0, t);
}

// Evaluation
export function evaluate(ctx: evalContext<PTerm>): evalContext<PTerm> | null {
  const { term, state } = ctx;

  // Check for beta reduction: (λx.M) N -> M[N/x]
  if (term.type === "App" && term.left.type === "Abs") {
    // Perform beta reduction
    const substituted = substitute(term.left.body, term.left.name, term.right);
    return { term: substituted, state };
  }

  // Otherwise, delegate to the variant's evaluation
  const impl = getImpl(term);
  return impl.evaluation(evaluate, state)(term);
}

// Free variables
export function freeVars(t: PTerm): Set<string> {
  const impl = getImpl(t);
  return impl.freeVarsCollector(freeVars, t);
}

// Pretty print
export function print(t: PTerm): string {
  const impl = getImpl(t);
  return impl.print(print, t);
}

// Evaluate to normal form
export function evalToNormalForm(
  term: PTerm,
  state: Map<string, PTerm> = new Map(),
  maxSteps: number = 1000
): PTerm | null {
  const renamedTerm = alphaConvert(term);

  const loop = (ctx: evalContext<PTerm>, steps: number): PTerm => {
    if (steps <= 0) {
      return ctx.term;
    }

    const nextCtx = evaluate(ctx);

    if (nextCtx === null) {
      return ctx.term;
    }

    if (nextCtx.term === ctx.term) {
      return ctx.term;
    }

    return loop(nextCtx, steps - 1);
  };

  return loop({ term: renamedTerm, state }, maxSteps);
}
