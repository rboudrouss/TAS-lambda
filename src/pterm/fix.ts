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
import { arrowConstructor } from "../ptype/arrow.ts";

const fixPTermName = "Fix" as const;

interface fixPtermType {
  readonly type: typeof fixPTermName;
  readonly func: PTerm;
}

function fixConstructor(arg: { func: PTerm }): fixPtermType {
  return { type: fixPTermName, func: arg.func };
}

declare module "../types.ts" {
  interface PTermRegistry {
    [fixPTermName]: fixPtermType;
  }
}

const fixParser = (recurse: SingleParser<PTerm>): SingleParser<fixPtermType> =>
  C.string("fix")
    .drop()
    .then(C.char(" ").rep().drop())
    .then(F.lazy(() => recurse))
    .map((r) => fixConstructor({ func: r.at(0) as PTerm }));

const fixAlphaConversion = (
  recurse: (t: PTerm, renaming: Map<string, string>) => PTerm,
  renaming: Map<string, string>,
  _freshVarGen: () => string,
  t: fixPtermType
): PTerm => fixConstructor({ func: recurse(t.func, renaming) });

const fixSubstitution = (
  recurse: (t: PTerm, v: string, t0: PTerm) => PTerm,
  v: string,
  t0: PTerm,
  t: fixPtermType
): PTerm => fixConstructor({ func: recurse(t.func, v, t0) });

// Evaluation: fix (λf.M) → M[f := fix (λf.M)]
// Note: The actual unfolding is handled at the top level in evaluate() in eval.ts
const fixEvaluation =
  (recurse: (ctx: evalContext<PTerm>) => evalContext<PTerm> | null, state: Map<string, PTerm>) =>
  (t: fixPtermType): evalContext<PTerm> | null => {
    // Try to reduce func
    const funcResult = recurse({ term: t.func, state });
    if (funcResult) {
      return { term: fixConstructor({ func: funcResult.term }), state: funcResult.state };
    }
    // If func is a lambda, the unfolding is handled in eval.ts
    return null;
  };

const fixFreeVarsCollector = (
  recurse: (t: PTerm) => Set<string>,
  t: fixPtermType
): Set<string> => recurse(t.func);

const fixPrint = (recurse: (t: PTerm) => string, t: fixPtermType): string =>
  `(fix ${recurse(t.func)})`;

const fixInfer = (
  recurse: (t: PTerm, env: Environnement<PType>, ctx: InferContext) => InferResult,
  env: Environnement<PType>,
  ctx: InferContext,
  t: fixPtermType
): InferResult => {
  const funcResult = recurse(t.func, env, ctx);
  if (!funcResult.success) return funcResult;

  const resultType = ctx.freshTypeVar();
  const expectedFuncType = arrowConstructor({ left: resultType, right: resultType });
  const unifyResult = ctx.unify(funcResult.type, expectedFuncType, funcResult.substitution);
  if (!unifyResult.success) return unifyResult;

  const finalResultType = ctx.applySubst(unifyResult.substitution, resultType);
  return { success: true, type: finalResultType, substitution: unifyResult.substitution };
};

export const fixPTermImplementation = {
  [fixPTermName]: {
    pTermName: fixPTermName,
    constructor: fixConstructor,
    parser: fixParser,
    alphaConversion: fixAlphaConversion,
    substitution: fixSubstitution,
    evaluation: fixEvaluation,
    freeVarsCollector: fixFreeVarsCollector,
    print: fixPrint,
    infer: fixInfer,
  } as pTermImplementation<fixPtermType>,
};

export { fixConstructor };

