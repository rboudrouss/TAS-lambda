import { SingleParser, C, F } from "@masala/parser";
import type {
  pTermImplementation,
  PTerm,
  Environnement,
  PType,
  InferContext,
  InferResult,
  evalContext,
} from "../types.ts";
import { tRefConstructor } from "../ptype/ref.ts";
import { regionConstructor } from "./region.ts";

const mkrefPTermName = "Mkref" as const;

interface mkrefPtermType {
  readonly type: typeof mkrefPTermName;
  readonly expr: PTerm;
}

function mkrefConstructor(arg: { expr: PTerm }): mkrefPtermType {
  return { type: mkrefPTermName, expr: arg.expr };
}

declare module "../types.ts" {
  interface PTermRegistry {
    [mkrefPTermName]: mkrefPtermType;
  }
}

const mkrefParser = (recurse: SingleParser<PTerm>): SingleParser<mkrefPtermType> =>
  C.string("ref")
    .drop()
    .then(C.char(" ").rep().drop())
    .then(F.lazy(() => recurse))
    .map((r) => mkrefConstructor({ expr: r.at(0) as PTerm }));

const mkrefAlphaConversion = (
  recurse: (t: PTerm, renaming: Map<string, string>) => PTerm,
  renaming: Map<string, string>,
  _freshVarGen: () => string,
  t: mkrefPtermType
): PTerm => mkrefConstructor({ expr: recurse(t.expr, renaming) });

const mkrefSubstitution = (
  recurse: (t: PTerm, v: string, t0: PTerm) => PTerm,
  v: string,
  t0: PTerm,
  t: mkrefPtermType
): PTerm => mkrefConstructor({ expr: recurse(t.expr, v, t0) });

let regionCounter = 0;
export function resetRegionCounter() {
  regionCounter = 0;
}

const mkrefEvaluation =
  (recurse: (ctx: evalContext<PTerm>) => evalContext<PTerm> | null, state: Map<string, PTerm>) =>
  (t: mkrefPtermType): { term: PTerm; state: Map<string, PTerm> } | null => {
    // Try to reduce expr
    const exprResult = recurse({ term: t.expr, state });
    if (exprResult) {
      return { term: mkrefConstructor({ expr: exprResult.term }), state: exprResult.state };
    }
    // expr is a value, create a new region
    const newRegionId = regionCounter++;
    const regionKey = `ρ${newRegionId}`;
    const newState = new Map(state);
    newState.set(regionKey, t.expr);
    return { term: regionConstructor({ id: newRegionId }), state: newState };
  };

const mkrefFreeVarsCollector = (
  recurse: (t: PTerm) => Set<string>,
  t: mkrefPtermType
): Set<string> => recurse(t.expr);

const mkrefPrint = (recurse: (t: PTerm) => string, t: mkrefPtermType): string =>
  `(ref ${recurse(t.expr)})`;

const mkrefInfer = (
  recurse: (t: PTerm, env: Environnement<PType>, ctx: InferContext) => InferResult,
  env: Environnement<PType>,
  ctx: InferContext,
  t: mkrefPtermType
): InferResult => {
  const exprResult = recurse(t.expr, env, ctx);
  if (!exprResult.success) return exprResult;

  return {
    success: true,
    type: tRefConstructor({ inner: exprResult.type }),
    substitution: exprResult.substitution,
  };
};

export const mkrefPTermImplementation = {
  [mkrefPTermName]: {
    pTermName: mkrefPTermName,
    constructor: mkrefConstructor,
    parser: mkrefParser,
    alphaConversion: mkrefAlphaConversion,
    substitution: mkrefSubstitution,
    evaluation: mkrefEvaluation,
    freeVarsCollector: mkrefFreeVarsCollector,
    print: mkrefPrint,
    infer: mkrefInfer,
  } as pTermImplementation<mkrefPtermType>,
};

export { mkrefConstructor };

