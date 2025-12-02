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
import { tUnitConstructor } from "../ptype/unit.ts";
import { unitConstructor } from "./unit.ts";

const assignPTermName = "Assign" as const;

interface assignPtermType {
  readonly type: typeof assignPTermName;
  readonly ref: PTerm;
  readonly value: PTerm;
}

function assignConstructor(arg: { ref: PTerm; value: PTerm }): assignPtermType {
  return { type: assignPTermName, ref: arg.ref, value: arg.value };
}

declare module "../types.ts" {
  interface PTermRegistry {
    [assignPTermName]: assignPtermType;
  }
}

// pour simplifier on parse en préfixe (:= e1 e2)
const assignParser = (recurse: SingleParser<PTerm>): SingleParser<assignPtermType> =>
  C.string(":=")
    .drop()
    .then(C.char(" ").rep().drop())
    .then(F.lazy(() => recurse))
    .then(C.char(" ").rep().drop())
    .then(F.lazy(() => recurse))
    .map((r) => assignConstructor({ ref: r.at(0) as PTerm, value: r.at(1) as PTerm }));

const assignAlphaConversion = (
  recurse: (t: PTerm, renaming: Map<string, string>) => PTerm,
  renaming: Map<string, string>,
  _freshVarGen: () => string,
  t: assignPtermType
): PTerm => assignConstructor({
  ref: recurse(t.ref, renaming),
  value: recurse(t.value, renaming),
});

const assignSubstitution = (
  recurse: (t: PTerm, v: string, t0: PTerm) => PTerm,
  v: string,
  t0: PTerm,
  t: assignPtermType
): PTerm => assignConstructor({
  ref: recurse(t.ref, v, t0),
  value: recurse(t.value, v, t0),
});

const assignEvaluation =
  (recurse: (ctx: evalContext<PTerm>) => evalContext<PTerm> | null, state: Map<string, PTerm>) =>
  (t: assignPtermType): { term: PTerm; state: Map<string, PTerm> } | null => {
    const refResult = recurse({ term: t.ref, state });
    if (refResult) {
      return { term: assignConstructor({ ref: refResult.term, value: t.value }), state: refResult.state };
    }
    const valueResult = recurse({ term: t.value, state });
    if (valueResult) {
      return { term: assignConstructor({ ref: t.ref, value: valueResult.term }), state: valueResult.state };
    }
    if (t.ref.type === "Region") {
      const regionKey = `ρ${t.ref.id}`;
      const newState = new Map(state);
      newState.set(regionKey, t.value);
      return { term: unitConstructor({}), state: newState };
    }
    return null;
  };

const assignFreeVarsCollector = (
  recurse: (t: PTerm) => Set<string>,
  t: assignPtermType
): Set<string> => new Set([...recurse(t.ref), ...recurse(t.value)]);

const assignPrint = (recurse: (t: PTerm) => string, t: assignPtermType): string =>
  `(${recurse(t.ref)} := ${recurse(t.value)})`;

// Type inference Unit where e1 : Ref T and e2 : T
const assignInfer = (
  recurse: (t: PTerm, env: Environnement<PType>, ctx: InferContext) => InferResult,
  env: Environnement<PType>,
  ctx: InferContext,
  t: assignPtermType
): InferResult => {
  const refResult = recurse(t.ref, env, ctx);
  if (!refResult.success) return refResult;

  const envAfterRef = ctx.applySubstToEnv(refResult.substitution, env);
  const valueResult = recurse(t.value, envAfterRef, ctx);
  if (!valueResult.success) return valueResult;

  // Compose substitutions
  const subst1 = composeSubst(ctx, refResult.substitution, valueResult.substitution);
  const refType = ctx.applySubst(valueResult.substitution, refResult.type);
  
  // ref should be Ref T where T is the type of value
  const expectedRefType = tRefConstructor({ inner: valueResult.type });
  const unifyResult = ctx.unify(refType, expectedRefType, subst1);
  if (!unifyResult.success) return unifyResult;

  return {
    success: true,
    type: tUnitConstructor({}),
    substitution: unifyResult.substitution,
  };
};

function composeSubst(ctx: InferContext, s1: Map<string, PType>, s2: Map<string, PType>): Map<string, PType> {
  const result = new Map<string, PType>();
  for (const [k, v] of s1) result.set(k, ctx.applySubst(s2, v));
  for (const [k, v] of s2) if (!result.has(k)) result.set(k, v);
  return result;
}

export const assignPTermImplementation = {
  [assignPTermName]: {
    pTermName: assignPTermName,
    constructor: assignConstructor,
    parser: assignParser,
    alphaConversion: assignAlphaConversion,
    substitution: assignSubstitution,
    evaluation: assignEvaluation,
    freeVarsCollector: assignFreeVarsCollector,
    print: assignPrint,
    infer: assignInfer,
  } as pTermImplementation<assignPtermType>,
};

export { assignConstructor };

