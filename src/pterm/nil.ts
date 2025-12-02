import { SingleParser, C } from "@masala/parser";
import type {
  pTermImplementation,
  PTerm,
  Environnement,
  PType,
  InferContext,
  InferResult,
} from "../types.ts";
import { tListConstructor } from "../ptype/list.ts";

const nilPTermName = "Nil" as const;

function nilConstructor(_arg: Record<string, never>) {
  return { type: nilPTermName };
}

type nilPtermType = ReturnType<typeof nilConstructor>;

declare module "../types.ts" {
  interface PTermRegistry {
    [nilPTermName]: nilPtermType;
  }
}

// Parser: nil keyword
const nilParser = (_recurse: SingleParser<PTerm>): SingleParser<nilPtermType> =>
  C.string("nil").map(() => nilConstructor({}));

// Alpha conversion: no variables
const nilAlphaConversion = (
  _recurse: (t: PTerm, renaming: Map<string, string>) => PTerm,
  _renaming: Map<string, string>,
  _freshVarGen: () => string,
  t: nilPtermType
): PTerm => t;

// Substitution: no variables
const nilSubstitution = (
  _recurse: unknown,
  _v: string,
  _t0: PTerm,
  t: nilPtermType
): PTerm => t;

// Evaluation: nil is a value
const nilEvaluation =
  (_recurse: unknown, _state: Map<string, PTerm>) =>
  (_t: nilPtermType): { term: PTerm; state: Map<string, PTerm> } | null =>
    null;

// Free variables: none
const nilFreeVarsCollector = (
  _recurse: (t: PTerm) => Set<string>,
  _t: nilPtermType
): Set<string> => new Set();

// Print
const nilPrint = (_recurse: (t: PTerm) => string, _t: nilPtermType): string =>
  "nil";

// Type inference: nil has type [a] for fresh a
const nilInfer = (
  _recurse: (t: PTerm, env: Environnement<PType>, ctx: InferContext) => InferResult,
  _env: Environnement<PType>,
  ctx: InferContext,
  _t: nilPtermType
): InferResult => ({
  success: true,
  type: tListConstructor({ elem: ctx.freshTypeVar() }),
  substitution: new Map(),
});

export const nilPTermImplementation = {
  [nilPTermName]: {
    pTermName: nilPTermName,
    constructor: nilConstructor,
    parser: nilParser,
    alphaConversion: nilAlphaConversion,
    substitution: nilSubstitution,
    evaluation: nilEvaluation,
    freeVarsCollector: nilFreeVarsCollector,
    print: nilPrint,
    infer: nilInfer,
  } as pTermImplementation<nilPtermType>,
};

export { nilConstructor };

