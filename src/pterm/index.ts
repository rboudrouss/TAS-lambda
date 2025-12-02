import { C, F, Stream, type SingleParser } from "@masala/parser";
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


// Atom parser: variable, abstraction, or parenthesized term
function atomParser(): SingleParser<PTerm> {
  return F.try(
    C.char("(")
      .drop()
      .then(F.lazy(termParser))
      .then(C.char(")").drop())
      .map((tuple) => tuple.at(0) as PTerm)
  )
    .or(F.try(registry.Abs.parser(F.lazy(termParser))))
    .or(registry.Var.parser(F.lazy(termParser)));
}

// Term parser: handles application (left-associative)
// Parses: atom (space+ atom)*
export function termParser(): SingleParser<PTerm> {
  return F.lazy(atomParser)
    .then(
      C.char(" ")
        .rep()
        .drop()
        .then(F.lazy(atomParser))
        .optrep()
    )
    .map((tuple) => {
      const first = tuple.at(0) as PTerm;
      const rest = tuple.array() as PTerm[];

      // Filter out the first element (which we already have)
      const restTerms = rest.slice(1);

      if (restTerms.length === 0) {
        return first;
      }

      // Left-fold to create left-associative application
      return restTerms.reduce(
        (acc, arg) => registry.App.constructor({ left: acc, right: arg }),
        first
      );
    });
}

// Parse a string into a PTerm
export function parseTerm(input: string): PTerm | null {
  const result = termParser().parse(Stream.ofChars(input.trim()));
  if (result.isAccepted()) {
    return result.value;
  }
  return null;
}

export { registry };

export type { PTerm };