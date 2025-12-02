import type { pTypeImplementation, PType } from "../types.ts";

const forallPTypeName = "Forall" as const;

interface forallType {
  readonly type: typeof forallPTypeName;
  readonly var: string;
  readonly body: PType;
}

function forallConstructor(arg: { var: string; body: PType }): forallType {
  return { type: forallPTypeName, var: arg.var, body: arg.body };
}

declare module "../types.ts" {
  interface PTypeRegistry {
    [forallPTypeName]: forallType;
  }
}

// Free vars: free vars of body minus the quantified variable
const forallFreeVarsCollector = (
  recurse: (ty: PType) => Set<string>,
  ty: forallType
): Set<string> => {
  const bodyFreeVars = recurse(ty.body);
  bodyFreeVars.delete(ty.var);
  return bodyFreeVars;
};

// Substitution: substitute in body, but not if var is the one being substituted
const forallTypeSubstitution = (
  recurse: (ty: PType, v: string, t0: PType) => PType,
  v: string,
  t0: PType,
  ty: forallType
): PType => {
  if (ty.var === v) {
    return ty; // Don't substitute the bound variable
  }
  return forallConstructor({ var: ty.var, body: recurse(ty.body, v, t0) });
};

// Contains var: check body, but bound var shadows
const forallContainsVar = (
  recurse: (varName: string, ty: PType) => boolean,
  varName: string,
  ty: forallType
): boolean => {
  if (ty.var === varName) {
    return false; // Bound variable shadows
  }
  return recurse(varName, ty.body);
};

// Print: ∀a. T
const forallPrint = (recurse: (ty: PType) => string, ty: forallType): string =>
  `(∀${ty.var}. ${recurse(ty.body)})`;

export const forallPTypeImplementation = {
  [forallPTypeName]: {
    pTypeName: forallPTypeName,
    constructor: forallConstructor,
    freeVarsCollector: forallFreeVarsCollector,
    typeSubstitution: forallTypeSubstitution,
    containsVar: forallContainsVar,
    print: forallPrint,
  } as pTypeImplementation<forallType>,
};

export { forallConstructor };

