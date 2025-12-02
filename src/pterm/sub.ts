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
import { intConstructor } from "./int.ts";

const subPTermName = "Sub" as const;

interface subPtermType {
  readonly type: typeof subPTermName;
  readonly left: PTerm;
  readonly right: PTerm;
}

function subConstructor(arg: { left: PTerm; right: PTerm }): subPtermType {
  return { type: subPTermName, left: arg.left, right: arg.right };
}

declare module "../types.ts" {
  interface PTermRegistry {
    [subPTermName]: subPtermType;
  }
}

const subParser = (recurse: SingleParser<PTerm>): SingleParser<subPtermType> =>
  C.string("sub")
    .drop()
    .then(C.char(" ").rep().drop())
    .then(F.lazy(() => recurse))
    .then(C.char(" ").rep().drop())
    .then(F.lazy(() => recurse))
    .map((r) => subConstructor({ left: r.at(0) as PTerm, right: r.at(1) as PTerm }));

const subAlphaConversion = (
  recurse: (t: PTerm, renaming: Map<string, string>) => PTerm,
  renaming: Map<string, string>,
  _freshVarGen: () => string,
  t: subPtermType
): PTerm =>
  subConstructor({
    left: recurse(t.left, renaming),
    right: recurse(t.right, renaming),
  });

const subSubstitution = (
  recurse: (t: PTerm, v: string, t0: PTerm) => PTerm,
  v: string,
  t0: PTerm,
  t: subPtermType
): PTerm =>
  subConstructor({
    left: recurse(t.left, v, t0),
    right: recurse(t.right, v, t0),
  });

const subEvaluation =
  (recurse: (ctx: evalContext<PTerm>) => evalContext<PTerm> | null, state: Map<string, PTerm>) =>
  (t: subPtermType): evalContext<PTerm> | null => {
    const leftResult = recurse({ term: t.left, state });
    if (leftResult) {
      return { term: subConstructor({ left: leftResult.term, right: t.right }), state: leftResult.state };
    }
    const rightResult = recurse({ term: t.right, state });
    if (rightResult) {
      return { term: subConstructor({ left: t.left, right: rightResult.term }), state: rightResult.state };
    }
    if (t.left.type === "Int" && t.right.type === "Int") {
      return { term: intConstructor({ value: t.left.value - t.right.value }), state };
    }
    return null;
  };

const subFreeVarsCollector = (
  recurse: (t: PTerm) => Set<string>,
  t: subPtermType
): Set<string> => new Set([...recurse(t.left), ...recurse(t.right)]);

const subPrint = (recurse: (t: PTerm) => string, t: subPtermType): string =>
  `(${recurse(t.left)} - ${recurse(t.right)})`;

const subInfer = (
  recurse: (t: PTerm, env: Environnement<PType>, ctx: InferContext) => InferResult,
  env: Environnement<PType>,
  ctx: InferContext,
  t: subPtermType
): InferResult => {
  const leftResult = recurse(t.left, env, ctx);
  if (!leftResult.success) return leftResult;

  const envAfterLeft = ctx.applySubstToEnv(leftResult.substitution, env);
  const rightResult = recurse(t.right, envAfterLeft, ctx);
  if (!rightResult.success) return rightResult;

  const subst1 = composeSubst(ctx, leftResult.substitution, rightResult.substitution);
  const leftType = ctx.applySubst(rightResult.substitution, leftResult.type);

  const intType = tIntConstructor({});
  const unify1 = ctx.unify(leftType, intType, subst1);
  if (!unify1.success) return unify1;

  const unify2 = ctx.unify(rightResult.type, intType, unify1.substitution);
  if (!unify2.success) return unify2;

  return { success: true, type: intType, substitution: unify2.substitution };
};

function composeSubst(ctx: InferContext, s1: Map<string, PType>, s2: Map<string, PType>): Map<string, PType> {
  const result = new Map<string, PType>();
  for (const [k, v] of s1) result.set(k, ctx.applySubst(s2, v));
  for (const [k, v] of s2) if (!result.has(k)) result.set(k, v);
  return result;
}

export const subPTermImplementation = {
  [subPTermName]: {
    pTermName: subPTermName,
    constructor: subConstructor,
    parser: subParser,
    alphaConversion: subAlphaConversion,
    substitution: subSubstitution,
    evaluation: subEvaluation,
    freeVarsCollector: subFreeVarsCollector,
    print: subPrint,
    infer: subInfer,
  } as pTermImplementation<subPtermType>,
};

export { subConstructor };

