import { SingleParser, F } from "@masala/parser";
import type {
  pTermImplementation,
  PTerm,
  Environnement,
  PType,
  InferContext,
  InferResult,
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

// Reserved words that cannot be used as variable names
const RESERVED_WORDS = new Set([
  "let", "in",
  "add", "sub",
  "head", "tail", "cons", "nil",
  "ifz", "ife", "then", "else",
  "fix",
  "ref",
]);

// Parser

const varParser = (_recurse: SingleParser<PTerm>): SingleParser<varPtermType> =>
  F.regex(/[a-zA-Z_][a-zA-Z0-9_]*/)
    .filter((m) => !RESERVED_WORDS.has(m))
    .map((m) => {
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

// Type inference
const varInfer = (
  _recurse: (
    t: PTerm,
    env: Environnement<PType>,
    ctx: InferContext
  ) => InferResult,
  env: Environnement<PType>,
  ctx: InferContext,
  t: varPtermType
): InferResult => {
  const varType = env.get(t.name);
  if (!varType) {
    // should never happen since we asing a type to every free variable before inferring
    return { success: false, error: `Unbound variable: ${t.name}` };
  }
  // Instantiate polymorphic types
  const instType = ctx.instantiate(varType);
  return { success: true, type: instType, substitution: new Map() };
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
    infer: varInfer,
  } as pTermImplementation<varPtermType>,
};
