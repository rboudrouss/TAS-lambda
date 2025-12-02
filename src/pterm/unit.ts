import { SingleParser, C } from "@masala/parser";
import type {
  pTermImplementation,
  PTerm,
  Environnement,
  PType,
  InferContext,
  InferResult,
} from "../types.ts";
import { tUnitConstructor } from "../ptype/unit.ts";

const unitPTermName = "Unit" as const;

function unitConstructor(_arg: Record<string, never>) {
  return { type: unitPTermName };
}

type unitPtermType = ReturnType<typeof unitConstructor>;

declare module "../types.ts" {
  interface PTermRegistry {
    [unitPTermName]: unitPtermType;
  }
}

const unitParser = (_recurse: SingleParser<PTerm>): SingleParser<unitPtermType> =>
  C.string("()")
    .map(() => unitConstructor({}));

const unitAlphaConversion = (
  _recurse: (t: PTerm, renaming: Map<string, string>) => PTerm,
  _renaming: Map<string, string>,
  _freshVarGen: () => string,
  t: unitPtermType
): PTerm => t;

const unitSubstitution = (
  _recurse: unknown,
  _v: string,
  _t0: PTerm,
  t: unitPtermType
): PTerm => t;

const unitEvaluation =
  (_recurse: unknown, _state: Map<string, PTerm>) =>
  (_t: unitPtermType): { term: PTerm; state: Map<string, PTerm> } | null =>
    null;

const unitFreeVarsCollector = (
  _recurse: (t: PTerm) => Set<string>,
  _t: unitPtermType
): Set<string> => new Set();

const unitPrint = (_recurse: (t: PTerm) => string, _t: unitPtermType): string =>
  "()";

const unitInfer = (
  _recurse: (t: PTerm, env: Environnement<PType>, ctx: InferContext) => InferResult,
  _env: Environnement<PType>,
  _ctx: InferContext,
  _t: unitPtermType
): InferResult => ({
  success: true,
  type: tUnitConstructor({}),
  substitution: new Map(),
});

export const unitPTermImplementation = {
  [unitPTermName]: {
    pTermName: unitPTermName,
    constructor: unitConstructor,
    parser: unitParser,
    alphaConversion: unitAlphaConversion,
    substitution: unitSubstitution,
    evaluation: unitEvaluation,
    freeVarsCollector: unitFreeVarsCollector,
    print: unitPrint,
    infer: unitInfer,
  } as pTermImplementation<unitPtermType>,
};

export { unitConstructor };

