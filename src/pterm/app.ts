import { SingleParser, C, F } from "@masala/parser";
import type {
  pTermImplementation,
  PTerm,
  evalContext,
  PType,
  Environnement,
  Equation,
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

// Generate Equation

const appGenEquation = (
  recurse: (t: PTerm, ty: PType, env: Environnement<PType>) => Equation<PType>,
  targetType: PType,
  env: Environnement<PType>,
  freshTypeVar: () => PType,
  t: appPtermType
): Equation<PType> => {
  const argType = freshTypeVar();

  // M must have type (argType -> targetType)
  const arrowType = arrowConstructor({ left: argType, right: targetType });

  const leftEquations = recurse(t.left, arrowType, env);
  const rightEquations = recurse(t.right, argType, env);

  return [...leftEquations, ...rightEquations];
};

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
    genEquation: appGenEquation,
  } as pTermImplementation<appPtermType>,
};
