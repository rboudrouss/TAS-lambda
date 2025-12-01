import type {
  PTerm,
  pTermImplementation,
  evalContext,
} from "../general-types.ts";

// Import all pterm variant implementations
import { varPTermImplementation } from "./var.ts";
import { absPTermImplementation } from "./abs.ts";
import { appPTermImplementation } from "./app.ts";
import { PTermRegistry } from "../general-types.ts";

// Collect all implementations
const registry: {
  [K in PTerm["type"]]: pTermImplementation<PTermRegistry[K]>;
} = {
  ...varPTermImplementation,
  ...absPTermImplementation,
  ...appPTermImplementation,
} as const;


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

function getImpl<K extends PTerm["type"]>(
  t: PTerm & { type: K }
): pTermImplementation<PTermRegistry[K]> {
  const impl = registry[t.type as K];

  if (!impl) {
    // exhaustiveness check, if next line can be reached, typescript would've complained
    const _exhaustive: never = impl;
    throw new Error(`Unknown PTerm type: ${t.type}`);
  }

  return impl;
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

// Evaluate to normal form
export function evalToNormalForm(
  term: PTerm,
  state: Map<string, PTerm> = new Map()
): PTerm | null {
  const renamedTerm = alphaConvert(term);

  const loop = (ctx: evalContext<PTerm>): PTerm => {
    const nextCtx = evaluate(ctx);

    // No more reductions possible - reached normal form
    if (nextCtx === null) {
      return ctx.term;
    }

    // Prevent infinite loops on stuck terms
    if (nextCtx.term === ctx.term) {
      return ctx.term;
    }

    // Continue reducing recursively
    return loop(nextCtx);
  };

  return loop({ term: renamedTerm, state });
}


export { registry };

export type { PTerm };