import type { Equation, Environnement, PType } from "./types.ts";
import { getImpl, type PTerm } from "./pterm/index.ts";
import { getTypeImpl } from "./ptype/index.ts";
import { tVarConstructor } from "./ptype/var.ts";
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

export function typeSubstitute(ty: PType, varName: string, newType: PType): PType {
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

export function generateEquations(
  t: PTerm,
  targetType: PType,
  env: Environnement<PType>
): Equation<PType> {
  const impl = getImpl(t);
  return impl.genEquation(generateEquations, targetType, env, freshTypeVar, t);
}

function substituteInEquation(
  eq: ReadonlyArray<readonly [PType, PType]>,
  varName: string,
  newType: PType
): Array<readonly [PType, PType]> {
  return eq.map(([t1, t2]) => [
    typeSubstitute(t1, varName, newType),
    typeSubstitute(t2, varName, newType),
  ] as const);
}

export type UnificationResult =
  | { success: true; type: PType }
  | { success: false; error: string };

const MAX_UNIFICATION_STEPS = 1000;

export function unify(
  equations: Equation<PType>,
  target: PType,
  maxSteps: number = MAX_UNIFICATION_STEPS
): UnificationResult {
  let eqs = [...equations];
  let targetType = target;
  let steps = maxSteps;

  while (eqs.length > 0 && steps > 0) {
    const [[t1, t2], ...rest] = eqs;
    eqs = rest;
    steps--;

    // Case 1: Both are the same type variable - skip
    if (t1.type === "TVar" && t2.type === "TVar" && t1.name === t2.name) {
      continue;
    }

    // Case 2: t1 is a type variable
    if (t1.type === "TVar") {
      // Occurs check
      if (typeContainsVar(t1.name, t2)) {
        return { success: false, error: `Occurs check failed: ${t1.name} appears in ${printType(t2)}` };
      }
      // Substitute everywhere
      eqs = substituteInEquation(eqs, t1.name, t2);
      targetType = typeSubstitute(targetType, t1.name, t2);
      continue;
    }

    // Case 3: t2 is a type variable
    if (t2.type === "TVar") {
      // Occurs check
      if (typeContainsVar(t2.name, t1)) {
        return { success: false, error: `Occurs check failed: ${t2.name} appears in ${printType(t1)}` };
      }
      // Substitute everywhere
      eqs = substituteInEquation(eqs, t2.name, t1);
      targetType = typeSubstitute(targetType, t2.name, t1);
      continue;
    }

    // Case 4: Both are Arrow types - decompose
    if (t1.type === "Arrow" && t2.type === "Arrow") {
      eqs = [[t1.left, t2.left], [t1.right, t2.right], ...eqs];
      continue;
    }

    // Case 5: Incompatible types
    return { success: false, error: `Cannot unify ${printType(t1)} with ${printType(t2)}` };
  }

  if (steps === 0) {
    return { success: false, error: "Unification timeout" };
  }

  return { success: true, type: targetType };
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
): UnificationResult {
  resetTypeVarCounter();
  const freeVarEnv = buildFreeVarEnv(term);
  const fullEnv = new Map([...freeVarEnv, ...env]); // env overrides freeVarEnv
  const targetType = freshTypeVar();
  const equations = generateEquations(term, targetType, fullEnv);
  return unify(equations, targetType);
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

