import { SingleParser, F } from "@masala/parser";
import type {
  pTermImplementation,
  PTerm,
  Environnement,
  PType,
  InferContext,
  InferResult,
} from "../types.ts";
import { tIntConstructor } from "../ptype/int.ts";

const intPTermName = "Int" as const;

function intConstructor(arg: { value: number }) {
  return { type: intPTermName, value: arg.value };
}

type intPtermType = ReturnType<typeof intConstructor>;

declare module "../types.ts" {
  interface PTermRegistry {
    [intPTermName]: intPtermType;
  }
}

const intParser = (_recurse: SingleParser<PTerm>): SingleParser<intPtermType> =>
  F.regex(/[0-9]+/).map((m) => intConstructor({ value: parseInt(m, 10) }));

const intAlphaConversion = (
  _recurse: (t: PTerm, renaming: Map<string, string>) => PTerm,
  _renaming: Map<string, string>,
  _freshVarGen: () => string,
  t: intPtermType
): PTerm => t;

const intSubstitution = (
  _recurse: unknown,
  _v: string,
  _t0: PTerm,
  t: intPtermType
): PTerm => t;

const intEvaluation =
  (_recurse: unknown, _state: Map<string, PTerm>) =>
  (_t: intPtermType): { term: PTerm; state: Map<string, PTerm> } | null =>
    null;

const intFreeVarsCollector = (
  _recurse: (t: PTerm) => Set<string>,
  _t: intPtermType
): Set<string> => new Set();

const intPrint = (_recurse: (t: PTerm) => string, t: intPtermType): string =>
  String(t.value);

const intInfer = (
  _recurse: (t: PTerm, env: Environnement<PType>, ctx: InferContext) => InferResult,
  _env: Environnement<PType>,
  _ctx: InferContext,
  _t: intPtermType
): InferResult => ({
  success: true,
  type: tIntConstructor({}),
  substitution: new Map(),
});

export const intPTermImplementation = {
  [intPTermName]: {
    pTermName: intPTermName,
    constructor: intConstructor,
    parser: intParser,
    alphaConversion: intAlphaConversion,
    substitution: intSubstitution,
    evaluation: intEvaluation,
    freeVarsCollector: intFreeVarsCollector,
    print: intPrint,
    infer: intInfer,
  } as pTermImplementation<intPtermType>,
};

export { intConstructor };

