import { SingleParser, F } from "@masala/parser";
import type {
  pTermImplementation,
  PTerm,
  PType,
  Environnement,
  Equation,
} from "../types.ts";

// Definition

const varPTermName = "Var" as const;

function varConstructor(arg: { name: string }) {
  return { type: varPTermName, name: arg.name };
}

type varPtermType = ReturnType<typeof varConstructor>;

declare module "../types.ts" {
  interface PTermRegistry {
    [varPTermName]: varPtermType;
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

// Print

const varPrint = (_recurse: (t: PTerm) => string, t: varPtermType): string =>
  t.name;

// Generate Equation (type inference)

const varGenEquation = (
  _recurse: (t: PTerm, ty: PType, env: Environnement<PType>) => Equation<PType>,
  targetType: PType,
  env: Environnement<PType>,
  _freshTypeVar: () => PType,
  t: varPtermType
): Equation<PType> => {
  const varType = env.get(t.name);
  if (!varType) {
    throw new Error(`Unbound variable: ${t.name}`);
  }
  return [[varType, targetType]];
};

// Export

export const varPTermImplementation = {
  [varPTermName]: {
    pTermName: varPTermName,
    constructor: varConstructor,
    parser: varParser,
    alphaConversion: varAlphaConversion,
    substitution: varSubstitution,
    evaluation: varEvaluation,
    freeVarsCollector: varFreeVarsCollector,
    print: varPrint,
    genEquation: varGenEquation,
  } as pTermImplementation<varPtermType>,
};
