import { SingleParser, F } from "@masala/parser";
import type { pTermImplementation, generalPTerm } from "../general-types.ts";

// Definition

const varPTermName = "Var" as const;

function varConstructor(arg: { name: string }) {
  return { type: varPTermName, name: arg.name } satisfies generalPTerm;
}

type varPtermType = ReturnType<typeof varConstructor>;

// Parser

const varParser = <T extends generalPTerm>(
  _recurse: SingleParser<T>
): SingleParser<varPtermType> =>
  F.regex(/[a-zA-Z_][a-zA-Z0-9_]*/).map((m) => {
    return varConstructor({ name: m });
  });

// Alpha conversion

const varAlphaConversion = <T extends varPtermType>(
  _recurse: (t: T, renaming: Map<string, string>) => T,
  renaming: Map<string, string>,
  _freshVarGen: () => string,
  t: varPtermType
): T => {
  const newName = renaming.get(t.name);
  return (newName ? { type: varPTermName, name: newName } : t) as T;
};

const needConversion = false;

// Substitution

const varSubstitution = <T extends generalPTerm>(
  _recurse: unknown,
  v: string,
  t0: T,
  t: varPtermType
): T => (t.name === v ? t0 : t) as T;

// Evaluation

const varEvaluation =
  <T extends generalPTerm>(_recurse: unknown, state: Map<string, T>) =>
  (t: varPtermType): { term: T; state: Map<string, T> } | null => {
    const value = state.get(t.name);
    return value ? { term: value, state } : null;
  };

// Free variables collector

const varFreeVarsCollector = <T extends generalPTerm>(
  _recurse: (t: T) => Set<string>,
  t: varPtermType
): Set<string> => new Set([t.name]);

// Export

export const varPTermImplementation = <
  T extends varPtermType
>(): pTermImplementation<
  varPtermType,
  Parameters<typeof varConstructor>,
  T
> => ({
  pTermName: varPTermName,
  constructor: varConstructor,
  parser: varParser,
  alphaConversion: varAlphaConversion,
  needConversion,
  substitution: varSubstitution,
  evaluation: varEvaluation,
  freeVarsCollector: varFreeVarsCollector,
});
