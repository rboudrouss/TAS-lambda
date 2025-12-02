import type { evalContext } from "./types.ts";
import { getImpl, type PTerm } from "./pterm/index.ts";

let varCounter = 0;

export function freshVarGen(): string {
  return `v${varCounter++}`;
}

export function resetVarCounter(): void {
  varCounter = 0;
}

export function alphaConvert(
  t: PTerm,
  renaming: Map<string, string> = new Map()
): PTerm {
  const impl = getImpl(t);
  return impl.alphaConversion(alphaConvert, renaming, freshVarGen, t);
}

export function substitute(t: PTerm, v: string, t0: PTerm): PTerm {
  const impl = getImpl(t);
  return impl.substitution(substitute, v, t0, t);
}

export function evaluate(ctx: evalContext<PTerm>): evalContext<PTerm> | null {
  const { term, state } = ctx;

  if (term.type === "App" && term.left.type === "Abs") {
    const substituted = substitute(term.left.body, term.left.name, term.right);
    return { term: substituted, state };
  }

  const impl = getImpl(term);
  return impl.evaluation(evaluate, state)(term);
}

export function freeVars(t: PTerm): Set<string> {
  const impl = getImpl(t);
  return impl.freeVarsCollector(freeVars, t);
}

export function print(t: PTerm): string {
  const impl = getImpl(t);
  return impl.print(print, t);
}

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
