import { SingleParser, C, F } from "@masala/parser";
import type {
  pTermImplementation,
  PTerm,
  evalContext,
  PType,
  Environnement,
  InferContext,
  InferResult,
} from "../types.ts";
import { arrowConstructor } from "../ptype/arrow.ts";

// Definition

const appPTermName = "App" as const;

interface appPtermType {
  readonly type: typeof appPTermName;
  readonly left: PTerm;
  readonly right: PTerm;
}

function appConstructor(arg: { left: PTerm; right: PTerm }): appPtermType {
  return { type: appPTermName, left: arg.left, right: arg.right };
}

declare module "../types.ts" {
  interface PTermRegistry {
    [appPTermName]: appPtermType;
  }
}

// Parser
// Note: Application parsing with left-associativity is typically handled
// at a higher level. This parser expects explicit parentheses: (M N)

const appParser = (recurse: SingleParser<PTerm>): SingleParser<appPtermType> =>
  C.char("(")
    .drop()
    .then(F.lazy(() => recurse))
    .then(C.char(" ").rep().drop())
    .then(F.lazy(() => recurse))
    .then(C.char(")").drop())
    .map((tuple) => {
      const left = tuple.at(0) as PTerm;
      const right = tuple.at(1) as PTerm;
      return appConstructor({ left, right });
    });

// Alpha conversion

const appAlphaConversion = (
  recurse: (t: PTerm, renaming: Map<string, string>) => PTerm,
  renaming: Map<string, string>,
  _freshVarGen: () => string,
  t: appPtermType
): PTerm => {
  const newLeft = recurse(t.left, renaming);
  const newRight = recurse(t.right, renaming);
  return appConstructor({ left: newLeft, right: newRight });
};

// Substitution

const appSubstitution = (
  recurse: (t: PTerm, v: string, t0: PTerm) => PTerm,
  v: string,
  t0: PTerm,
  t: appPtermType
): PTerm => {
  const newLeft = recurse(t.left, v, t0);
  const newRight = recurse(t.right, v, t0);
  return appConstructor({ left: newLeft, right: newRight });
};

// Evaluation (call-by-value, left-to-right)
// Note: Beta reduction is handled at the top level in evaluate()
const appEvaluation =
  (
    recurse: (ctx: evalContext<PTerm>) => evalContext<PTerm> | null,
    state: Map<string, PTerm>
  ) =>
  (t: appPtermType): { term: PTerm; state: Map<string, PTerm> } | null => {
    // Try to evaluate the left side first
    const leftResult = recurse({ term: t.left, state });
    if (leftResult && leftResult.term !== t.left) {
      return {
        term: appConstructor({ left: leftResult.term, right: t.right }),
        state: leftResult.state,
      };
    }

    // Then try to evaluate the right side
    const rightResult = recurse({ term: t.right, state });
    if (rightResult && rightResult.term !== t.right) {
      return {
        term: appConstructor({ left: t.left, right: rightResult.term }),
        state: rightResult.state,
      };
    }

    return null;
  };

// Free variables collector

const appFreeVarsCollector = (
  recurse: (t: PTerm) => Set<string>,
  t: appPtermType
): Set<string> => {
  const leftFreeVars = recurse(t.left);
  const rightFreeVars = recurse(t.right);
  return new Set([...leftFreeVars, ...rightFreeVars]);
};

// Print

const appPrint = (recurse: (t: PTerm) => string, t: appPtermType): string =>
  `(${recurse(t.left)} ${recurse(t.right)})`;

// Type inference (Algorithm W)
// For (M N): infer M, infer N, unify M's type with (N's type → fresh), return fresh

const appInfer = (
  recurse: (t: PTerm, env: Environnement<PType>, ctx: InferContext) => InferResult,
  env: Environnement<PType>,
  ctx: InferContext,
  t: appPtermType
): InferResult => {
  // Infer type of left (function)
  const leftResult = recurse(t.left, env, ctx);
  if (!leftResult.success) {
    return leftResult;
  }

  // Apply substitution to env before inferring right
  const envAfterLeft = ctx.applySubstToEnv(leftResult.substitution, env);

  // Infer type of right (argument)
  const rightResult = recurse(t.right, envAfterLeft, ctx);
  if (!rightResult.success) {
    return rightResult;
  }

  // Compose substitutions
  const composedSubst = composeSubst(ctx, leftResult.substitution, rightResult.substitution);

  // Apply composed substitution to left's type
  const leftType = ctx.applySubst(rightResult.substitution, leftResult.type);

  // Create fresh result type and unify left with (right → result)
  const resultType = ctx.freshTypeVar();
  const expectedFuncType = arrowConstructor({ left: rightResult.type, right: resultType });

  const unifyResult = ctx.unify(leftType, expectedFuncType, composedSubst);
  if (!unifyResult.success) {
    return unifyResult;
  }

  // Apply final substitution to result type
  const finalType = ctx.applySubst(unifyResult.substitution, resultType);
  return { success: true, type: finalType, substitution: unifyResult.substitution };
};

// Compose two substitutions: apply s2 to values of s1, then merge
function composeSubst(
  ctx: InferContext,
  s1: Map<string, PType>,
  s2: Map<string, PType>
): Map<string, PType> {
  const result = new Map<string, PType>();
  for (const [k, v] of s1) {
    result.set(k, ctx.applySubst(s2, v));
  }
  for (const [k, v] of s2) {
    if (!result.has(k)) {
      result.set(k, v);
    }
  }
  return result;
}

// Export

export const appPTermImplementation = {
  [appPTermName]: {
    pTermName: appPTermName,
    constructor: appConstructor,
    parser: appParser,
    alphaConversion: appAlphaConversion,
    substitution: appSubstitution,
    evaluation: appEvaluation,
    freeVarsCollector: appFreeVarsCollector,
    print: appPrint,
    infer: appInfer,
  } as pTermImplementation<appPtermType>,
};
