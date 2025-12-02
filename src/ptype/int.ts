import type { pTypeImplementation, PType } from "../types.ts";

const tIntPTypeName = "TInt" as const;

interface tIntType {
  readonly type: typeof tIntPTypeName;
}

function tIntConstructor(_arg: Record<string, never>): tIntType {
  return { type: tIntPTypeName };
}

declare module "../types.ts" {
  interface PTypeRegistry {
    [tIntPTypeName]: tIntType;
  }
}

const tIntFreeVarsCollector = (
  _recurse: (ty: PType) => Set<string>,
  _ty: tIntType
): Set<string> => new Set();

const tIntTypeSubstitution = (
  _recurse: (ty: PType, v: string, t0: PType) => PType,
  _v: string,
  _t0: PType,
  ty: tIntType
): PType => ty;

const tIntContainsVar = (
  _recurse: (varName: string, ty: PType) => boolean,
  _varName: string,
  _ty: tIntType
): boolean => false;

const tIntPrint = (_recurse: (ty: PType) => string, _ty: tIntType): string =>
  "Int";

export const tIntPTypeImplementation = {
  [tIntPTypeName]: {
    pTypeName: tIntPTypeName,
    constructor: tIntConstructor,
    freeVarsCollector: tIntFreeVarsCollector,
    typeSubstitution: tIntTypeSubstitution,
    containsVar: tIntContainsVar,
    print: tIntPrint,
  } as pTypeImplementation<tIntType>,
};

export { tIntConstructor };

