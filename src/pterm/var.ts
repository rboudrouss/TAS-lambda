import { SingleParser, F } from "@masala/parser";
import type { pTermImplementation, PTerm } from "../general-types.ts";

// Definition

const varPTermName = "Var" as const;

function varConstructor(arg: { name: string }) {
  return { type: varPTermName, name: arg.name };
}

type varPtermType = ReturnType<typeof varConstructor>;

declare module "../general-types.ts" {
  interface PTermRegistry {
    Var: varPtermType;
  }
}

// Parser

const varParser = (_recurse: SingleParser<PTerm>): SingleParser<varPtermType> =>
  F.regex(/[a-zA-Z_][a-zA-Z0-9_]*/).map((m) => {
    return varConstructor({ name: m });
  });

// Alpha conversion

const varAlphaConversion = (
  _recurse: (t: PTerm, renaming: Map<string, string>) => PTerm,
  renaming: Map<string, string>,
  _freshVarGen: () => string,
  t: varPtermType
): PTerm => {
  const newName = renaming.get(t.name);
  return newName ? varConstructor({ name: newName }) : t;
};

const needConversion = false;

// Substitution

const varSubstitution = (
  _recurse: unknown,
  v: string,
  t0: PTerm,
  t: varPtermType
): PTerm => (t.name === v ? t0 : t);

// Evaluation

const varEvaluation =
  (_recurse: unknown, state: Map<string, PTerm>) =>
  (t: varPtermType): { term: PTerm; state: Map<string, PTerm> } | null => {
    const value = state.get(t.name);
    return value ? { term: value, state } : null;
  };

// Free variables collector

const varFreeVarsCollector = (
  _recurse: (t: PTerm) => Set<string>,
  t: varPtermType
): Set<string> => new Set([t.name]);

// Export

export const varPTermImplementation: pTermImplementation<
  varPtermType,
  Parameters<typeof varConstructor>
> = {
  pTermName: varPTermName,
  constructor: varConstructor,
  parser: varParser,
  alphaConversion: varAlphaConversion,
  needConversion,
  substitution: varSubstitution,
  evaluation: varEvaluation,
  freeVarsCollector: varFreeVarsCollector,
};
