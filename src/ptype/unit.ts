import type { pTypeImplementation, PType } from "../types.ts";

const tUnitPTypeName = "TUnit" as const;

interface tUnitType {
  readonly type: typeof tUnitPTypeName;
}

function tUnitConstructor(_arg: Record<string, never>): tUnitType {
  return { type: tUnitPTypeName };
}

declare module "../types.ts" {
  interface PTypeRegistry {
    [tUnitPTypeName]: tUnitType;
  }
}

const tUnitFreeVarsCollector = (
  _recurse: (ty: PType) => Set<string>,
  _ty: tUnitType
): Set<string> => new Set();

const tUnitTypeSubstitution = (
  _recurse: (ty: PType, v: string, t0: PType) => PType,
  _v: string,
  _t0: PType,
  ty: tUnitType
): PType => ty;

const tUnitContainsVar = (
  _recurse: (varName: string, ty: PType) => boolean,
  _varName: string,
  _ty: tUnitType
): boolean => false;

const tUnitPrint = (_recurse: (ty: PType) => string, _ty: tUnitType): string =>
  "Unit";

export const tUnitPTypeImplementation = {
  [tUnitPTypeName]: {
    pTypeName: tUnitPTypeName,
    constructor: tUnitConstructor,
    freeVarsCollector: tUnitFreeVarsCollector,
    typeSubstitution: tUnitTypeSubstitution,
    containsVar: tUnitContainsVar,
    print: tUnitPrint,
  } as pTypeImplementation<tUnitType>,
};

export { tUnitConstructor };

