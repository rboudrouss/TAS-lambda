import { SingleParser, C, F } from "@masala/parser";
import type { pTermImplementation, PTerm, evalContext } from "../general-types.ts";

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

declare module "../general-types.ts" {
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

const needConversion = (t: appPtermType, recurse: (t: PTerm) => boolean): boolean =>
  recurse(t.left) || recurse(t.right);

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

// Type guard for AbsTerm (needed for beta reduction)
function isAbs(t: PTerm): t is PTerm & { type: "Abs"; name: string; body: PTerm } {
  return t.type === "Abs";
}

// Evaluation

const appEvaluation =
  (recurse: (ctx: evalContext<PTerm>) => evalContext<PTerm> | null, state: Map<string, PTerm>) =>
  (t: appPtermType): { term: PTerm; state: Map<string, PTerm> } | null => {
    // First, evaluate the left side (the function)
    const leftResult = recurse({ term: t.left, state });
    if (!leftResult) return null;

    // Then, evaluate the right side (the argument)
    const rightResult = recurse({ term: t.right, state: leftResult.state });
    if (!rightResult) return null;

    const func = leftResult.term;
    const arg = rightResult.term;

    // If left is an abstraction, perform beta reduction
    if (isAbs(func)) {
      // We need substitution - but we don't have access to it here
      // This requires the evaluation to receive a substitute function
      // For now, return the reduced application
      return { term: appConstructor({ left: func, right: arg }), state: rightResult.state };
    }

    // If left is not a function, return the application (stuck term)
    return { term: appConstructor({ left: func, right: arg }), state: rightResult.state };
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

const appPrint = (
  recurse: (t: PTerm) => string,
  t: appPtermType
): string => `(${recurse(t.left)} ${recurse(t.right)})`;

// Export

export const appPTermImplementation: pTermImplementation<
  appPtermType,
  Parameters<typeof appConstructor>
> = {
  pTermName: appPTermName,
  constructor: appConstructor,
  parser: appParser,
  alphaConversion: appAlphaConversion,
  needConversion,
  substitution: appSubstitution,
  evaluation: appEvaluation,
  freeVarsCollector: appFreeVarsCollector,
  print: appPrint,
};
