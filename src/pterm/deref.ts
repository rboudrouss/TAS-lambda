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

const derefPTermName = "Deref" as const;

interface derefPtermType {
  readonly type: typeof derefPTermName;
  readonly expr: PTerm;
}

function derefConstructor(arg: { expr: PTerm }): derefPtermType {
  return { type: derefPTermName, expr: arg.expr };
}

declare module "../types.ts" {
  interface PTermRegistry {
    [derefPTermName]: derefPtermType;
  }
}

// Parser: !e
const derefParser = (recurse: SingleParser<PTerm>): SingleParser<derefPtermType> =>
  C.char("!")
    .drop()
    .then(F.lazy(() => recurse))
    .map((r) => derefConstructor({ expr: r.at(0) as PTerm }));

// Alpha conversion
const derefAlphaConversion = (
  recurse: (t: PTerm, renaming: Map<string, string>) => PTerm,
  renaming: Map<string, string>,
  _freshVarGen: () => string,
  t: derefPtermType
): PTerm => derefConstructor({ expr: recurse(t.expr, renaming) });

// Substitution
const derefSubstitution = (
  recurse: (t: PTerm, v: string, t0: PTerm) => PTerm,
  v: string,
  t0: PTerm,
  t: derefPtermType
): PTerm => derefConstructor({ expr: recurse(t.expr, v, t0) });

// Evaluation: reduce expr first, if it's a region, look up in state
const derefEvaluation =
  (recurse: (ctx: evalContext<PTerm>) => evalContext<PTerm> | null, state: Map<string, PTerm>) =>
  (t: derefPtermType): { term: PTerm; state: Map<string, PTerm> } | null => {
    // Try to reduce expr
    const exprResult = recurse({ term: t.expr, state });
    if (exprResult) {
      return { term: derefConstructor({ expr: exprResult.term }), state: exprResult.state };
    }
    // expr is a value, check if it's a region
    if (t.expr.type === "Region") {
      const regionKey = `ρ${t.expr.id}`;
      const value = state.get(regionKey);
      if (value) {
        return { term: value, state };
      }
    }
    return null;
  };

// Free variables
const derefFreeVarsCollector = (
  recurse: (t: PTerm) => Set<string>,
  t: derefPtermType
): Set<string> => recurse(t.expr);

// Print
const derefPrint = (recurse: (t: PTerm) => string, t: derefPtermType): string =>
  `!${recurse(t.expr)}`;

// Type inference: !e : T where e : Ref T
const derefInfer = (
  recurse: (t: PTerm, env: Environnement<PType>, ctx: InferContext) => InferResult,
  env: Environnement<PType>,
  ctx: InferContext,
  t: derefPtermType
): InferResult => {
  const exprResult = recurse(t.expr, env, ctx);
  if (!exprResult.success) return exprResult;

  const resultType = ctx.freshTypeVar();
  const expectedType = tRefConstructor({ inner: resultType });
  const exprType = ctx.applySubst(exprResult.substitution, exprResult.type);
  
  const unifyResult = ctx.unify(exprType, expectedType, exprResult.substitution);
  if (!unifyResult.success) return unifyResult;

  return {
    success: true,
    type: ctx.applySubst(unifyResult.substitution, resultType),
    substitution: unifyResult.substitution,
  };
};

export const derefPTermImplementation = {
  [derefPTermName]: {
    pTermName: derefPTermName,
    constructor: derefConstructor,
    parser: derefParser,
    alphaConversion: derefAlphaConversion,
    substitution: derefSubstitution,
    evaluation: derefEvaluation,
    freeVarsCollector: derefFreeVarsCollector,
    print: derefPrint,
    infer: derefInfer,
  } as pTermImplementation<derefPtermType>,
};

export { derefConstructor };

