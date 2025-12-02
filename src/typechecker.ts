import type {
  Environnement,
  PType,
  InferContext,
  InferResult,
  Substitution,
} from "./types.ts";
import { getImpl, type PTerm } from "./pterm/index.ts";
import { getTypeImpl } from "./ptype/index.ts";
import { tVarConstructor } from "./ptype/var.ts";
import { forallConstructor } from "./ptype/forall.ts";
import { freeVars } from "./eval.ts";

let typeVarCounter = 0;

export function freshTypeVar(): PType {
  return tVarConstructor({ name: `T${typeVarCounter++}` });
}

export function resetTypeVarCounter(): void {
  typeVarCounter = 0;
}

export function typeFreeVars(ty: PType): Set<string> {
  const impl = getTypeImpl(ty);
  return impl.freeVarsCollector(typeFreeVars, ty);
}

export function typeSubstitute(
  ty: PType,
  varName: string,
  newType: PType
): PType {
  const impl = getTypeImpl(ty);
  return impl.typeSubstitution(typeSubstitute, varName, newType, ty);
}

export function typeContainsVar(varName: string, ty: PType): boolean {
  const impl = getTypeImpl(ty);
  return impl.containsVar(typeContainsVar, varName, ty);
}

export function printType(ty: PType): string {
  const impl = getTypeImpl(ty);
  return impl.print(printType, ty);
}

// Apply a substitution to a type
export function applySubst(subst: Substitution, ty: PType): PType {
  let result = ty;
  for (const [varName, newType] of subst) {
    result = typeSubstitute(result, varName, newType);
  }
  return result;
}

// Apply a substitution to all types in an environment
export function applySubstToEnv(
  subst: Substitution,
  env: Environnement<PType>
): Environnement<PType> {
  const result: Environnement<PType> = new Map();
  for (const [name, ty] of env) {
    result.set(name, applySubst(subst, ty));
  }
  return result;
}

// Quantify over type variables not in the environment
export function generalize(ty: PType, env: Environnement<PType>): PType {
  const envFreeVars = new Set<string>();
  for (const envTy of env.values()) {
    for (const v of typeFreeVars(envTy)) {
      envFreeVars.add(v);
    }
  }
  const tyFreeVars = typeFreeVars(ty);
  let result = ty;
  for (const v of tyFreeVars) {
    if (!envFreeVars.has(v)) {
      result = forallConstructor({ var: v, body: result });
    }
  }
  return result;
}

// Replace quantified variables with fresh type variables
export function instantiate(ty: PType): PType {
  if (ty.type === "Forall") {
    const fresh = freshTypeVar();
    const substituted = typeSubstitute(ty.body, ty.var, fresh);
    return instantiate(substituted);
  }
  return ty;
}

const MAX_UNIFICATION_STEPS = 1000;

// Unify two types, extending the given substitution
export function unify(t1: PType, t2: PType, subst: Substitution): InferResult {
  // Apply current substitution to both types
  const type1 = applySubst(subst, t1);
  const type2 = applySubst(subst, t2);

  return unifyTypes(type1, type2, subst, MAX_UNIFICATION_STEPS);
}

function unifyTypes(
  t1: PType,
  t2: PType,
  subst: Substitution,
  steps: number
): InferResult {
  if (steps <= 0) {
    return { success: false, error: "Unification timeout" };
  }

  // Same type variable
  if (t1.type === "TVar" && t2.type === "TVar" && t1.name === t2.name) {
    return { success: true, type: t1, substitution: subst };
  }

  // t1 is a type variable
  if (t1.type === "TVar") {
    if (typeContainsVar(t1.name, t2)) {
      return {
        success: false,
        error: `Occurs check failed: ${t1.name} appears in ${printType(t2)}`,
      };
    }
    const newSubst = new Map(subst);
    newSubst.set(t1.name, t2);
    return { success: true, type: t2, substitution: newSubst };
  }

  // t2 is a type variable
  if (t2.type === "TVar") {
    if (typeContainsVar(t2.name, t1)) {
      return {
        success: false,
        error: `Occurs check failed: ${t2.name} appears in ${printType(t1)}`,
      };
    }
    const newSubst = new Map(subst);
    newSubst.set(t2.name, t1);
    return { success: true, type: t1, substitution: newSubst };
  }

  // Both are Arrow types
  if (t1.type === "Arrow" && t2.type === "Arrow") {
    const leftResult = unifyTypes(t1.left, t2.left, subst, steps - 1);
    if (!leftResult.success) {
      return leftResult;
    }
    const rightResult = unifyTypes(
      applySubst(leftResult.substitution, t1.right),
      applySubst(leftResult.substitution, t2.right),
      leftResult.substitution,
      steps - 1
    );
    return rightResult;
  }

  // Both are Int types
  if (t1.type === "TInt" && t2.type === "TInt") {
    return { success: true, type: t1, substitution: subst };
  }

  // Both are List types
  if (t1.type === "TList" && t2.type === "TList") {
    return unifyTypes(t1.elem, t2.elem, subst, steps - 1);
  }

  // Incompatible types
  return {
    success: false,
    error: `Cannot unify ${printType(t1)} with ${printType(t2)}`,
  };
}

// Main infer function that dispatches to variant implementations
function infer(
  term: PTerm,
  env: Environnement<PType>,
  ctx: InferContext
): InferResult {
  const impl = getImpl(term);
  return impl.infer(infer, env, ctx, term);
}

function buildFreeVarEnv(term: PTerm): Environnement<PType> {
  const env: Environnement<PType> = new Map();
  for (const v of freeVars(term)) {
    env.set(v, freshTypeVar());
  }
  return env;
}

export function inferType(
  term: PTerm,
  env: Environnement<PType> = new Map()
): InferResult {
  resetTypeVarCounter();
  const freeVarEnv = buildFreeVarEnv(term);
  const fullEnv = new Map([...freeVarEnv, ...env]);
  const ctx = {
    freshTypeVar,
    unify,
    generalize,
    instantiate,
    applySubst,
    applySubstToEnv,
  };
  return infer(term, fullEnv, ctx);
}

export function typeCheck(
  term: PTerm,
  env: Environnement<PType> = new Map()
): string {
  const result = inferType(term, env);

  if (result.success) {
    return `TYPABLE with type: ${printType(result.type)}`;
  } else {
    return `NOT TYPABLE: ${result.error}`;
  }
}
