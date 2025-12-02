import type { pTypeImplementation, PType } from "../types.ts";

const tVarPTypeName = "TVar" as const;

interface tVarType {
  readonly type: typeof tVarPTypeName;
  readonly name: string;
}

function tVarConstructor(arg: { name: string }): tVarType {
  return { type: tVarPTypeName, name: arg.name };
}

declare module "../types.ts" {
  interface PTypeRegistry {
    [tVarPTypeName]: tVarType;
  }
}

const tVarFreeVarsCollector = (
  _recurse: (ty: PType) => Set<string>,
  ty: tVarType
): Set<string> => new Set([ty.name]);

const tVarTypeSubstitution = (
  _recurse: (ty: PType, v: string, t0: PType) => PType,
  v: string,
  t0: PType,
  ty: tVarType
): PType => (ty.name === v ? t0 : ty);

const tVarContainsVar = (
  _recurse: (varName: string, ty: PType) => boolean,
  varName: string,
  ty: tVarType
): boolean => ty.name === varName;

const tVarPrint = (_recurse: (ty: PType) => string, ty: tVarType): string =>
  ty.name;

export const tVarPTypeImplementation = {
  [tVarPTypeName]: {
    pTypeName: tVarPTypeName,
    constructor: tVarConstructor,
    freeVarsCollector: tVarFreeVarsCollector,
    typeSubstitution: tVarTypeSubstitution,
    containsVar: tVarContainsVar,
    print: tVarPrint,
  } as pTypeImplementation<tVarType>,
};

export { tVarConstructor };
