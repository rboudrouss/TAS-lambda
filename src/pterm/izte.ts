import { SingleParser, C, F } from "@masala/parser";
import type {
  pTermImplementation,
  PTerm,
  evalContext,
  Environnement,
  PType,
  InferContext,
  InferResult,
} from "../types.ts";
import { tIntConstructor } from "../ptype/int.ts";

const iztePTermName = "Izte" as const;

interface iztePtermType {
  readonly type: typeof iztePTermName;
  readonly cond: PTerm;
  readonly then: PTerm;
  readonly else: PTerm;
}

function izteConstructor(arg: { cond: PTerm; then: PTerm; else: PTerm }): iztePtermType {
  return { type: iztePTermName, cond: arg.cond, then: arg.then, else: arg.else };
}

declare module "../types.ts" {
  interface PTermRegistry {
    [iztePTermName]: iztePtermType;
  }
}

// Parser: ifz C then T else E
const izteParser = (recurse: SingleParser<PTerm>): SingleParser<iztePtermType> =>
  C.string("ifz")
    .drop()
    .then(C.char(" ").rep().drop())
    .then(F.lazy(() => recurse))
    .then(C.char(" ").rep().drop())
    .then(C.string("then").drop())
    .then(C.char(" ").rep().drop())
    .then(F.lazy(() => recurse))
    .then(C.char(" ").rep().drop())
    .then(C.string("else").drop())
    .then(C.char(" ").rep().drop())
    .then(F.lazy(() => recurse))
    .map((r) => izteConstructor({
      cond: r.at(0) as PTerm,
      then: r.at(1) as PTerm,
      else: r.at(2) as PTerm,
    }));

// Alpha conversion
const izteAlphaConversion = (
  recurse: (t: PTerm, renaming: Map<string, string>) => PTerm,
  renaming: Map<string, string>,
  _freshVarGen: () => string,
  t: iztePtermType
): PTerm =>
  izteConstructor({
    cond: recurse(t.cond, renaming),
    then: recurse(t.then, renaming),
    else: recurse(t.else, renaming),
  });

// Substitution
const izteSubstitution = (
  recurse: (t: PTerm, v: string, t0: PTerm) => PTerm,
  v: string,
  t0: PTerm,
  t: iztePtermType
): PTerm =>
  izteConstructor({
    cond: recurse(t.cond, v, t0),
    then: recurse(t.then, v, t0),
    else: recurse(t.else, v, t0),
  });

// Evaluation: evaluate cond first, then pick branch (don't evaluate branches until chosen)
const izteEvaluation =
  (recurse: (ctx: evalContext<PTerm>) => evalContext<PTerm> | null, state: Map<string, PTerm>) =>
  (t: iztePtermType): evalContext<PTerm> | null => {
    // Try to reduce condition
    const condResult = recurse({ term: t.cond, state });
    if (condResult) {
      return { term: izteConstructor({ cond: condResult.term, then: t.then, else: t.else }), state: condResult.state };
    }
    // Condition is a value, check if it's zero
    if (t.cond.type === "Int") {
      return t.cond.value === 0
        ? { term: t.then, state }
        : { term: t.else, state };
    }
    return null;
  };

// Free variables
const izteFreeVarsCollector = (
  recurse: (t: PTerm) => Set<string>,
  t: iztePtermType
): Set<string> => new Set([...recurse(t.cond), ...recurse(t.then), ...recurse(t.else)]);

// Print
const iztePrint = (recurse: (t: PTerm) => string, t: iztePtermType): string =>
  `(ifz ${recurse(t.cond)} then ${recurse(t.then)} else ${recurse(t.else)})`;

// Type inference: cond must be Int, then and else must have same type
const izteInfer = (
  recurse: (t: PTerm, env: Environnement<PType>, ctx: InferContext) => InferResult,
  env: Environnement<PType>,
  ctx: InferContext,
  t: iztePtermType
): InferResult => {
  const condResult = recurse(t.cond, env, ctx);
  if (!condResult.success) return condResult;

  const intType = tIntConstructor({});
  const unifyInt = ctx.unify(condResult.type, intType, condResult.substitution);
  if (!unifyInt.success) return unifyInt;

  const env1 = ctx.applySubstToEnv(unifyInt.substitution, env);
  const thenResult = recurse(t.then, env1, ctx);
  if (!thenResult.success) return thenResult;

  const subst1 = composeSubst(ctx, unifyInt.substitution, thenResult.substitution);
  const env2 = ctx.applySubstToEnv(thenResult.substitution, env1);
  const elseResult = recurse(t.else, env2, ctx);
  if (!elseResult.success) return elseResult;

  const subst2 = composeSubst(ctx, subst1, elseResult.substitution);
  const thenType = ctx.applySubst(elseResult.substitution, thenResult.type);
  const unifyBranches = ctx.unify(thenType, elseResult.type, subst2);
  if (!unifyBranches.success) return unifyBranches;

  return { success: true, type: ctx.applySubst(unifyBranches.substitution, elseResult.type), substitution: unifyBranches.substitution };
};

function composeSubst(ctx: InferContext, s1: Map<string, PType>, s2: Map<string, PType>): Map<string, PType> {
  const result = new Map<string, PType>();
  for (const [k, v] of s1) result.set(k, ctx.applySubst(s2, v));
  for (const [k, v] of s2) if (!result.has(k)) result.set(k, v);
  return result;
}

export const iztePTermImplementation = {
  [iztePTermName]: {
    pTermName: iztePTermName,
    constructor: izteConstructor,
    parser: izteParser,
    alphaConversion: izteAlphaConversion,
    substitution: izteSubstitution,
    evaluation: izteEvaluation,
    freeVarsCollector: izteFreeVarsCollector,
    print: iztePrint,
    infer: izteInfer,
  } as pTermImplementation<iztePtermType>,
};

export { izteConstructor };

