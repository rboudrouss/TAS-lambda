import type {
  pTermImplementation,
  alphaConversionPartialFn,
  generalPTerm,
  substitutionPartialFn,
  evaluationPartialFn,
} from "../general-types.ts";

// Definition

const varPTermName = "Var" as const;

function varConstructor(arg: { name: string }) {
  return { type: varPTermName, name: arg.name } satisfies generalPTerm;
}

type varPtermType = ReturnType<typeof varConstructor>;

// Alpha conversion

const varAlphaConversion: alphaConversionPartialFn<varPtermType> =
  ({ renaming }) =>
  (t) => {
    const newName = renaming.get(t.name);
    return newName ? { type: varPTermName, name: newName } : t;
  };

const needConversion = false;

// Substitution

const varSubstitution: substitutionPartialFn<varPtermType> =
  ({ v, t0 }) =>
  (t) =>
    t.name === v ? t0 : t;

// Evaluation

const varEvaluation: evaluationPartialFn<varPtermType> =
  ({ state }) =>
  (t) => {
    const value = state.get(t.name);
    return value ? { term: value, state } : null;
  };

// Export

export const varPTermImplementation: pTermImplementation<varPtermType> = {
  pTermName: varPTermName,
  constructor: varConstructor,
  alphaConversion: varAlphaConversion,
  needConversion,
  substitution: varSubstitution,
  evaluation: varEvaluation,
};
