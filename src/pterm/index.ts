import type { PTerm, pTermImplementation, evalContext } from "../general-types.ts";

// Import all pterm variant implementations
import { varPTermImplementation } from "./var.ts";
import { absPTermImplementation } from "./abs.ts";
import { appPTermImplementation } from "./app.ts";

// Collect all implementations
const registry = {
  ...varPTermImplementation,
  ...absPTermImplementation,
  ...appPTermImplementation,
} as const;


// Re-export PTerm type
export type { PTerm };

// =============================================================================
// Fresh variable generator
// =============================================================================

let varCounter = 0;

export function freshVarGen(): string {
  return `_v${varCounter++}`;
}

export function resetVarCounter(): void {
  varCounter = 0;
}

// =============================================================================
// Combined operations (tying the recursive knot)
// =============================================================================

function getImpl(t: PTerm) {
  const impl = registry[t.type];

  if (!impl) {
    // exhaustiveness check, if next line can be reached, typescript would've complained
    const _exhaustive: never = impl;
    throw new Error(`Unknown PTerm type: ${t.type}`);
  }

  return impl;
}

// Alpha conversion
export function alphaConvert(t: PTerm, renaming: Map<string, string> = new Map()): PTerm {
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
  const impl = getImpl(ctx.term);
  return impl.evaluation(evaluate, ctx.state)(ctx.term);
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

// =============================================================================
// Evaluate to normal form
// =============================================================================

export function evalToNormalForm(
  term: PTerm,
  state: Map<string, PTerm> = new Map()
): PTerm | null {
  let ctx: evalContext<PTerm> | null = { term, state };
  let lastTerm = term;

  while (ctx !== null) {
    lastTerm = ctx.term;
    ctx = evaluate(ctx);

    // Prevent infinite loops on stuck terms
    if (ctx && ctx.term === lastTerm) {
      break;
    }
  }

  return lastTerm;
}

// =============================================================================
// Export implementations for direct access if needed
// =============================================================================

export { implementations };
