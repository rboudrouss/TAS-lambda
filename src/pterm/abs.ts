import { SingleParser, C, F } from "@masala/parser";
import type { pTermImplementation, PTerm } from "../general-types.ts";

// Definition

const absPTermName = "Abs" as const;

interface absPtermType {
  readonly type: typeof absPTermName;
  readonly name: string;
  readonly body: PTerm;
}

function absConstructor(arg: { name: string; body: PTerm }): absPtermType {
  return {
    type: absPTermName,
    name: arg.name,
    body: arg.body,
  };
}

declare module "../general-types.ts" {
  interface PTermRegistry {
    [absPTermName]: absPtermType;
  }
}

// Parser

const absParser = (recurse: SingleParser<PTerm>): SingleParser<absPtermType> =>
  C.charIn("\\λ")
    .drop()
    .then(F.regex(/[a-zA-Z_][a-zA-Z0-9_]*/))
    .then(C.char(".").drop())
    .then(F.lazy(() => recurse))
    .map((tuple) => {
      const name = tuple.at(0) as string;
      const body = tuple.at(1) as PTerm;
      return absConstructor({ name, body });
    });

// Alpha conversion

const absAlphaConversion = (
  recurse: (t: PTerm, renaming: Map<string, string>) => PTerm,
  renaming: Map<string, string>,
  freshVarGen: () => string,
  t: absPtermType
): PTerm => {
  const freshName = freshVarGen();
  const newRenaming = new Map(renaming);
  newRenaming.set(t.name, freshName);
  const newBody = recurse(t.body, newRenaming);
  return absConstructor({ name: freshName, body: newBody });
};

const needConversion = true;

// Substitution

const absSubstitution = (
  recurse: (t: PTerm, v: string, t0: PTerm) => PTerm,
  v: string,
  t0: PTerm,
  t: absPtermType
): PTerm => {
  // If the variable being substituted is the bound variable, no substitution in body
  if (t.name === v) {
    return t;
  }
  const newBody = recurse(t.body, v, t0);
  return absConstructor({ name: t.name, body: newBody });
};

// Evaluation

const absEvaluation =
  (_recurse: unknown, state: Map<string, PTerm>) =>
  (t: absPtermType): { term: PTerm; state: Map<string, PTerm> } | null => {
    return { term: t, state };
  };

// Free variables collector

const absFreeVarsCollector = (
  recurse: (t: PTerm) => Set<string>,
  t: absPtermType
): Set<string> => {
  const bodyFreeVars = recurse(t.body);
  bodyFreeVars.delete(t.name);
  return bodyFreeVars;
};

// Print

const absPrint = (recurse: (t: PTerm) => string, t: absPtermType): string =>
  `(fun ${t.name} -> ${recurse(t.body)})`;

// Export

export const absPTermImplementation = {
  [absPTermName]: {
    pTermName: absPTermName,
    constructor: absConstructor,
    parser: absParser,
    alphaConversion: absAlphaConversion,
    needConversion,
    substitution: absSubstitution,
    evaluation: absEvaluation,
    freeVarsCollector: absFreeVarsCollector,
    print: absPrint,
  } as pTermImplementation<absPtermType>,
};
