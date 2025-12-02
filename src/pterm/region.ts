import { SingleParser, F } from "@masala/parser";
import type {
  pTermImplementation,
  PTerm,
  Environnement,
  PType,
  InferContext,
  InferResult,
} from "../types.ts";
import { tRefConstructor } from "../ptype/ref.ts";

const regionPTermName = "Region" as const;

function regionConstructor(arg: { id: number }) {
  return { type: regionPTermName, id: arg.id };
}

type regionPtermType = ReturnType<typeof regionConstructor>;

declare module "../types.ts" {
  interface PTermRegistry {
    [regionPTermName]: regionPtermType;
  }
}

// Regions are runtime values, not usually parsed from user input
const regionParser = (_recurse: SingleParser<PTerm>): SingleParser<regionPtermType> =>
  F.regex(/ρ([0-9]+)/).map((m) => {
    const match = m.match(/ρ([0-9]+)/);
    return regionConstructor({ id: parseInt(match![1], 10) });
  });

const regionAlphaConversion = (
  _recurse: (t: PTerm, renaming: Map<string, string>) => PTerm,
  _renaming: Map<string, string>,
  _freshVarGen: () => string,
  t: regionPtermType
): PTerm => t;

const regionSubstitution = (
  _recurse: unknown,
  _v: string,
  _t0: PTerm,
  t: regionPtermType
): PTerm => t;

const regionEvaluation =
  (_recurse: unknown, _state: Map<string, PTerm>) =>
  (_t: regionPtermType): { term: PTerm; state: Map<string, PTerm> } | null =>
    null;

const regionFreeVarsCollector = (
  _recurse: (t: PTerm) => Set<string>,
  _t: regionPtermType
): Set<string> => new Set();

const regionPrint = (_recurse: (t: PTerm) => string, t: regionPtermType): string =>
  `ρ${t.id}`;

// Regions are created by ref and their type is inferred from context
const regionInfer = (
  _recurse: (t: PTerm, env: Environnement<PType>, ctx: InferContext) => InferResult,
  _env: Environnement<PType>,
  ctx: InferContext,
  _t: regionPtermType
): InferResult => ({
  success: true,
  type: tRefConstructor({ inner: ctx.freshTypeVar() }),
  substitution: new Map(),
});

export const regionPTermImplementation = {
  [regionPTermName]: {
    pTermName: regionPTermName,
    constructor: regionConstructor,
    parser: regionParser,
    alphaConversion: regionAlphaConversion,
    substitution: regionSubstitution,
    evaluation: regionEvaluation,
    freeVarsCollector: regionFreeVarsCollector,
    print: regionPrint,
    infer: regionInfer,
  } as pTermImplementation<regionPtermType>,
};

export { regionConstructor };

