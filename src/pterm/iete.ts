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
import { tListConstructor } from "../ptype/list.ts";

const ietePTermName = "Iete" as const;

interface ietePtermType {
  readonly type: typeof ietePTermName;
  readonly cond: PTerm;
  readonly then: PTerm;
  readonly else: PTerm;
}

function ieteConstructor(arg: { cond: PTerm; then: PTerm; else: PTerm }): ietePtermType {
  return { type: ietePTermName, cond: arg.cond, then: arg.then, else: arg.else };
}

declare module "../types.ts" {
  interface PTermRegistry {
    [ietePTermName]: ietePtermType;
  }
}

const ieteParser = (recurse: SingleParser<PTerm>): SingleParser<ietePtermType> =>
  C.string("ife")
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
    .map((r) => ieteConstructor({
      cond: r.at(0) as PTerm,
      then: r.at(1) as PTerm,
      else: r.at(2) as PTerm,
    }));

const ieteAlphaConversion = (
  recurse: (t: PTerm, renaming: Map<string, string>) => PTerm,
  renaming: Map<string, string>,
  _freshVarGen: () => string,
  t: ietePtermType
): PTerm =>
  ieteConstructor({
    cond: recurse(t.cond, renaming),
    then: recurse(t.then, renaming),
    else: recurse(t.else, renaming),
  });

const ieteSubstitution = (
  recurse: (t: PTerm, v: string, t0: PTerm) => PTerm,
  v: string,
  t0: PTerm,
  t: ietePtermType
): PTerm =>
  ieteConstructor({
    cond: recurse(t.cond, v, t0),
    then: recurse(t.then, v, t0),
    else: recurse(t.else, v, t0),
  });

const ieteEvaluation =
  (recurse: (ctx: evalContext<PTerm>) => evalContext<PTerm> | null, state: Map<string, PTerm>) =>
  (t: ietePtermType): evalContext<PTerm> | null => {
    // Try to reduce condition
    const condResult = recurse({ term: t.cond, state });
    if (condResult) {
      return { term: ieteConstructor({ cond: condResult.term, then: t.then, else: t.else }), state: condResult.state };
    }
    // Condition is a value, check if it's empty list (Nil)
    if (t.cond.type === "Nil") {
      return { term: t.then, state };
    }
    if (t.cond.type === "Cons") {
      return { term: t.else, state };
    }
    return null;
  };

const ieteFreeVarsCollector = (
  recurse: (t: PTerm) => Set<string>,
  t: ietePtermType
): Set<string> => new Set([...recurse(t.cond), ...recurse(t.then), ...recurse(t.else)]);

const ietePrint = (recurse: (t: PTerm) => string, t: ietePtermType): string =>
  `(ife ${recurse(t.cond)} then ${recurse(t.then)} else ${recurse(t.else)})`;

const ieteInfer = (
  recurse: (t: PTerm, env: Environnement<PType>, ctx: InferContext) => InferResult,
  env: Environnement<PType>,
  ctx: InferContext,
  t: ietePtermType
): InferResult => {
  const condResult = recurse(t.cond, env, ctx);
  if (!condResult.success) return condResult;

  const elemType = ctx.freshTypeVar();
  const listType = tListConstructor({ elem: elemType });
  const unifyList = ctx.unify(condResult.type, listType, condResult.substitution);
  if (!unifyList.success) return unifyList;

  const env1 = ctx.applySubstToEnv(unifyList.substitution, env);
  const thenResult = recurse(t.then, env1, ctx);
  if (!thenResult.success) return thenResult;

  const subst1 = composeSubst(ctx, unifyList.substitution, thenResult.substitution);
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

export const ietePTermImplementation = {
  [ietePTermName]: {
    pTermName: ietePTermName,
    constructor: ieteConstructor,
    parser: ieteParser,
    alphaConversion: ieteAlphaConversion,
    substitution: ieteSubstitution,
    evaluation: ieteEvaluation,
    freeVarsCollector: ieteFreeVarsCollector,
    print: ietePrint,
    infer: ieteInfer,
  } as pTermImplementation<ietePtermType>,
};

export { ieteConstructor };

