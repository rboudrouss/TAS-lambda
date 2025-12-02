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

const consPTermName = "Cons" as const;

interface consPtermType {
  readonly type: typeof consPTermName;
  readonly head: PTerm;
  readonly tail: PTerm;
}

function consConstructor(arg: { head: PTerm; tail: PTerm }): consPtermType {
  return { type: consPTermName, head: arg.head, tail: arg.tail };
}

declare module "../types.ts" {
  interface PTermRegistry {
    [consPTermName]: consPtermType;
  }
}

// cons M N
const consParser = (recurse: SingleParser<PTerm>): SingleParser<consPtermType> =>
  C.string("cons")
    .drop()
    .then(C.char(" ").rep().drop())
    .then(F.lazy(() => recurse))
    .then(C.char(" ").rep().drop())
    .then(F.lazy(() => recurse))
    .map((r) => consConstructor({ head: r.at(0) as PTerm, tail: r.at(1) as PTerm }));

const consAlphaConversion = (
  recurse: (t: PTerm, renaming: Map<string, string>) => PTerm,
  renaming: Map<string, string>,
  _freshVarGen: () => string,
  t: consPtermType
): PTerm =>
  consConstructor({
    head: recurse(t.head, renaming),
    tail: recurse(t.tail, renaming),
  });

const consSubstitution = (
  recurse: (t: PTerm, v: string, t0: PTerm) => PTerm,
  v: string,
  t0: PTerm,
  t: consPtermType
): PTerm =>
  consConstructor({
    head: recurse(t.head, v, t0),
    tail: recurse(t.tail, v, t0),
  });

const consEvaluation =
  (recurse: (ctx: evalContext<PTerm>) => evalContext<PTerm> | null, state: Map<string, PTerm>) =>
  (t: consPtermType): evalContext<PTerm> | null => {
    const headResult = recurse({ term: t.head, state });
    if (headResult) {
      return { term: consConstructor({ head: headResult.term, tail: t.tail }), state: headResult.state };
    }
    const tailResult = recurse({ term: t.tail, state });
    if (tailResult) {
      return { term: consConstructor({ head: t.head, tail: tailResult.term }), state: tailResult.state };
    }
    return null;
  };

const consFreeVarsCollector = (
  recurse: (t: PTerm) => Set<string>,
  t: consPtermType
): Set<string> => new Set([...recurse(t.head), ...recurse(t.tail)]);

const consPrint = (recurse: (t: PTerm) => string, t: consPtermType): string =>
  `(cons ${recurse(t.head)} ${recurse(t.tail)})`;

// Type inference head has type a, tail has type [a], result is [a]
const consInfer = (
  recurse: (t: PTerm, env: Environnement<PType>, ctx: InferContext) => InferResult,
  env: Environnement<PType>,
  ctx: InferContext,
  t: consPtermType
): InferResult => {
  const headResult = recurse(t.head, env, ctx);
  if (!headResult.success) return headResult;

  const envAfterHead = ctx.applySubstToEnv(headResult.substitution, env);
  const tailResult = recurse(t.tail, envAfterHead, ctx);
  if (!tailResult.success) return tailResult;

  const subst1 = composeSubst(ctx, headResult.substitution, tailResult.substitution);
  const headType = ctx.applySubst(tailResult.substitution, headResult.type);

  const expectedTailType = tListConstructor({ elem: headType });
  const unifyResult = ctx.unify(tailResult.type, expectedTailType, subst1);
  if (!unifyResult.success) return unifyResult;

  const finalListType = ctx.applySubst(unifyResult.substitution, expectedTailType);
  return { success: true, type: finalListType, substitution: unifyResult.substitution };
};

function composeSubst(ctx: InferContext, s1: Map<string, PType>, s2: Map<string, PType>): Map<string, PType> {
  const result = new Map<string, PType>();
  for (const [k, v] of s1) result.set(k, ctx.applySubst(s2, v));
  for (const [k, v] of s2) if (!result.has(k)) result.set(k, v);
  return result;
}

export const consPTermImplementation = {
  [consPTermName]: {
    pTermName: consPTermName,
    constructor: consConstructor,
    parser: consParser,
    alphaConversion: consAlphaConversion,
    substitution: consSubstitution,
    evaluation: consEvaluation,
    freeVarsCollector: consFreeVarsCollector,
    print: consPrint,
    infer: consInfer,
  } as pTermImplementation<consPtermType>,
};

export { consConstructor };

